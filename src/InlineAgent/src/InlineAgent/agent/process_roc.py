import copy
import inspect
import json
from typing import Any, Callable, Dict, Union
from termcolor import colored

from InlineAgent.constants import TraceColor


class ProcessROC:
    @staticmethod
    async def process_roc(
        inlineSessionState: Dict, roc_event: Dict, tool_map: Dict[str, Callable]
    ):
        # TODO: Tool to invoke is str and callable
        if "returnControlInvocationResults" in inlineSessionState:
            raise ValueError(
                "returnControlInvocationResults key is not supported in sessionState"
            )

        if "invocationId" in inlineSessionState:
            raise ValueError("invocationId key is not supported in sessionState")

        inlineSessionState = copy.deepcopy(inlineSessionState)
        inlineSessionState = {"returnControlInvocationResults": []}
        inlineSessionState["invocationId"] = roc_event["invocationId"]

        for invocationInput in roc_event["invocationInputs"]:

            # This is a Tagged Union structure. Only one of the following top level keys will be set: apiInvocationInput, functionInvocationInput.
            # If a client receives an unknown member it will set SDK_UNKNOWN_MEMBER as the top level key, which maps to the name or tag of the unknown member.
            # The structure of SDK_UNKNOWN_MEMBER is as follows: 'SDK_UNKNOWN_MEMBER': {'name': 'UnknownMemberName'}
            if "apiInvocationInput" in invocationInput:
                raise ValueError(
                    "apiInvocationInput is not supported in returnControlInvocationResults"
                )

            actionInvocationType = invocationInput["functionInvocationInput"][
                "actionInvocationType"
            ]
            functionInvocationInput = invocationInput["functionInvocationInput"]
            actionGroup = functionInvocationInput["actionGroup"]

            parameters = dict()
            for param in functionInvocationInput["parameters"]:
                if param["type"] == "array":
                    result = None
                    try:
                        result = json.loads(param["value"])
                    except Exception as e:
                        print(f"JSON parsing error: {str(e)}")
                        print(f"Attempting to fix malformed JSON: {param['value']}")
                        try:
                            # More robust JSON string handling
                            json_str = param["value"]
                            # First try to detect if it's already in a valid format but with syntax errors
                            if json_str.startswith('{') or json_str.startswith('['):
                                # Try different approaches to fix common JSON errors
                                try:
                                    # Try to evaluate as Python literal
                                    import ast
                                    result = ast.literal_eval(json_str)
                                except:
                                    # If that doesn't work, try more aggressive replacements
                                    json_str = (
                                        json_str
                                        .replace("=", ":")
                                        .replace("[{", '[{"')
                                        .replace("}]", '"}]')
                                    )
                                    json_str = json_str.replace(", ", '", "').replace(":", '":"')
                                    # Fix double replacement of colons inside already quoted strings
                                    json_str = json_str.replace('"":""', '":"')
                                    result = json.loads(json_str)
                            else:
                                # Handle non-JSON formatted strings
                                # Convert from key=value format to JSON
                                pairs = [p.strip() for p in json_str.split(',')]
                                result_dict = {}
                                for pair in pairs:
                                    if '=' in pair:
                                        k, v = pair.split('=', 1)
                                        result_dict[k.strip()] = v.strip()
                                result = result_dict
                        except Exception as parse_error:
                            print(f"Failed to fix JSON: {str(parse_error)}")
                            # As a last resort, just return the string as-is
                            result = param["value"]
                    finally:
                        parameters[param["name"]] = result
                elif param["type"] == "string":
                    parameters[param["name"]] = param["value"]
                elif param["type"] == "number":
                    parameters[param["name"]] = int(param["value"])
                elif param["type"] == "boolean":
                    parameters[param["name"]] = bool(param["value"])
                elif param["type"] == "integer":
                    parameters[param["name"]] = int(param["value"])
            if (
                actionInvocationType == "RESULT"
                or actionInvocationType == "USER_CONFIRMATION_AND_RESULT"
            ):
                tool_to_invoke: Callable = None
                if functionInvocationInput["function"] in tool_map:
                    tool_to_invoke = tool_map[functionInvocationInput["function"]]

                if not tool_to_invoke:
                    raise ValueError(
                        f"Function {functionInvocationInput['function']} not found in tools or tools class"
                    )

                if actionInvocationType == "USER_CONFIRMATION_AND_RESULT":
                    await ProcessROC.process_user_confirmation(
                        sessionState=inlineSessionState,
                        tool_to_invoke=tool_to_invoke,
                        functionInvocationInput=functionInvocationInput,
                        include_result=True,
                        parameters=parameters,
                    )

                else:
                    inlineSessionState["returnControlInvocationResults"].append(
                        {
                            "functionResult": await ProcessROC.invoke_roc_function(
                                functionInvocationInput=functionInvocationInput,
                                tool_to_invoke=tool_to_invoke,
                                parameters=parameters,
                                confirm=None,
                            )
                        }
                    )

            elif actionInvocationType == "USER_CONFIRMATION":
                tool_to_invoke = functionInvocationInput["function"]
                await ProcessROC.process_user_confirmation(
                    sessionState=inlineSessionState,
                    tool_to_invoke=tool_to_invoke,
                    functionInvocationInput=functionInvocationInput,
                    include_result=False,
                    parameters=parameters,
                )

        inlineSessionState.update(inlineSessionState)

        return inlineSessionState

    @staticmethod
    async def process_user_confirmation(
        sessionState: Dict,
        functionInvocationInput: Dict,
        include_result: bool,
        parameters: Dict,
        tool_to_invoke: Union[str, Callable] = None,
    ):
        while True:
            if isinstance(tool_to_invoke, Callable):
                tool_name = tool_to_invoke.__name__
            else:
                tool_name = tool_to_invoke
            confirmation_message = f"Do you want to proceed with {tool_name} with parameters : {json.dumps(parameters)}?"
            response = input(f"{confirmation_message} (y/n): ").lower()
            if response in ["y", "yes"]:
                if include_result:
                    sessionState["returnControlInvocationResults"].append(
                        {
                            "functionResult": await ProcessROC.invoke_roc_function(
                                functionInvocationInput=functionInvocationInput,
                                tool_to_invoke=tool_to_invoke,
                                confirm="CONFIRM",
                                parameters=parameters,
                            )
                        }
                    )
                else:
                    sessionState["returnControlInvocationResults"].append(
                        {
                            "functionResult": {
                                "actionGroup": functionInvocationInput["actionGroup"],
                                "agentId": functionInvocationInput["agentId"],
                                "function": functionInvocationInput["function"],
                                "confirmationState": "CONFIRM",
                            }
                        }
                    )
                break
            elif response in ["n", "no"]:
                if include_result:
                    sessionState["returnControlInvocationResults"].append(
                        {
                            "functionResult": {
                                "actionGroup": functionInvocationInput["actionGroup"],
                                "agentId": functionInvocationInput["agentId"],
                                "function": functionInvocationInput["function"],
                                "responseBody": {
                                    "TEXT": {
                                        "body": "Access Denied to this function. Do not try again."
                                    }
                                },
                                "confirmationState": "DENY",
                                # "responseState": "FAILURE"
                            }
                        }
                    )
                else:
                    sessionState["returnControlInvocationResults"].append(
                        {
                            "functionResult": {
                                "actionGroup": functionInvocationInput["actionGroup"],
                                "agentId": functionInvocationInput["agentId"],
                                "function": functionInvocationInput["function"],
                                "confirmationState": "DENY",
                                # "responseState": "FAILURE"
                            }
                        }
                    )
                break
            else:
                print("Please enter 'y' for yes or 'n' for no.")

    @staticmethod
    async def invoke_roc_function(
        functionInvocationInput: Dict,
        parameters: Dict = dict(),
        confirm: str = None,
        tool_to_invoke: Callable = None,
    ) -> Dict:

        functionResult = dict

        # TODO: responseState
        try:

            if inspect.iscoroutinefunction(tool_to_invoke):
                result = await tool_to_invoke(**parameters)
            else:
                result = tool_to_invoke(**parameters)

            print(
                colored(
                    f"Tool output: {result}",
                    TraceColor.invocation_input,
                )
            )

            functionResult = {
                "actionGroup": functionInvocationInput["actionGroup"],
                "agentId": functionInvocationInput["agentId"],
                "function": functionInvocationInput["function"],
                "responseBody": {"TEXT": {"body": result}},
            }
        except Exception as e:
            functionResult = {
                "actionGroup": functionInvocationInput["actionGroup"],
                "agentId": functionInvocationInput["agentId"],
                "function": functionInvocationInput["function"],
                "responseBody": {"TEXT": {"body": e}},
                "responseState": "FAILURE",
            }

        if confirm:
            if confirm == "CONFIRM":
                functionResult["confirmationState"] = confirm
                return functionResult
            else:
                raise ValueError("Only CONFIRM is a value value")
        else:
            return functionResult
