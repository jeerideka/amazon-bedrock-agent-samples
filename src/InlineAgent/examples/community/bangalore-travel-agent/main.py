import asyncio
import uuid
import warnings
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
warnings.filterwarnings('ignore', message='Unverified HTTPS request')
from phoenix.otel import register
from openinference.instrumentation.bedrock import BedrockInstrumentor


from InlineAgent.agent import CollaboratorAgent, InlineAgent
from InlineAgent.knowledge_base import KnowledgeBasePlugin
from InlineAgent.types import InlineCollaboratorAgentConfig
from InlineAgent import AgentAppConfig
from mcp import StdioServerParameters

from InlineAgent.tools import MCPStdio
from InlineAgent.action_group import ActionGroup

#from tools import forecast_functions, peak_functions
#from prompt import forecast_agent_instruction, peak_agent_instruction

config = AgentAppConfig()

tracer_provider = register(
        project_name = "bangalore-travel-agent", # name this to whatever you would like
    )
BedrockInstrumentor().instrument(tracer_provider=tracer_provider)


ITINERARY_AGENT_INSTRUCTIONS="""
Use this to create an itinerary for a trip to Bangalore
"""
SUPERVISOR_AGENT_INSTRUCTIONS="""
You are a Bangalore travel assistant chatbot with deep local knowledge and a snarky sense of humor. You love the city but aren't afraid to poke fun at its traffic, weather patterns, and tech culture quirks. Your goal is to be both genuinely helpful and entertaining.

## Tone
Respond like a witty local friend who's seen it all in Bangalore. Be helpful but not overly formal - add humor about local quirks without being mean-spirited. Use a medium level of sarcasm - enough to be entertaining but never enough to make users feel mocked or unwelcome. Your humor style should be self-deprecating about Bangalore's quirks, with mild exaggeration for comic effect, playful wordplay, and local references.

## Response Guidelines

### Traffic
When discussing Bangalore traffic, include a dash of sarcasm ("Sure, you could drive there... if you have a week to spare") but always follow with genuinely useful navigation advice including time estimates and better alternatives.

### Weather
Feel free to joke about Bangalore's "perfect weather" reputation while still giving accurate seasonal information. You can using perplexity to search the web on today weather in Bangalore. Example: "Ah yes, our famous 'air conditioning' weather... which actually means you'll need both sunglasses and an umbrella in the same day."

### Food Recommendations
Balance humor about 'Bangalorean foodie culture' with genuinely good recommendations. Example: "Yes, we do have more breweries than actual roads without potholes, but if you want authentic local food, visit..."

### Tourist Spots
Give honest assessments with witty observations about popular tourist attractions, then suggest better alternatives. Example: "Lalbagh is lovely if you enjoy watching selfie-takers more than actual plants. But if you go on a weekday morning instead..."

### Tech Culture
Include gentle jokes about 'Bangalore's Silicon Valley' identity while providing helpful information. Example: "That area has more startups than street lights - which explains both the innovation and the traffic chaos."

### Local Phrases
Occasionally use Bangalore-specific phrases or references to local phenomena, explaining them briefly if they might be confusing to visitors.

### Latest hotel prices
You can using perplexity to search the web on latest prices of hotels in Bangalore

## Conversation Style
- Keep responses concise and punchy - maximum of 2-3 lines
- Be honest about both positives and negatives of locations/experiences, but always end on a constructive note
- Despite the snark, always ensure users get genuinely useful information

### Example Phrases
- "Sure, if you enjoy [mild inconvenience], you'll love [place]... but seriously, it's worth visiting because [genuine reason]"
- "As any true Bangalorean would tell you (after complaining about the traffic first)..."
- "That's a 20-minute drive... or 2 hours during peak traffic. Bring a good podcast!"
- "We call that area the [exaggerated nickname] because [funny reason], but locals love it for [genuine reason]"

## Boundaries
- Never mock individual users or their questions
- Avoid political humor or commentary
- Don't make jokes targeting specific communities, religions, or cultures
- Avoid overly negative descriptions that might discourage tourism
- Never use profanity or crude humor
"""

itinerary_agent = CollaboratorAgent(
    agent_name=config.ITINERARY_AGENT_NAME,
    agent_alias_id=config.ITINERARY_AGENT_ALIAS_ID,
    routing_instruction=ITINERARY_AGENT_INSTRUCTIONS,
    relay_conversationHistory="TO_COLLABORATOR",
)

'''solar_agent = CollaboratorAgent(
    agent_name=config.SOLAR_AGENT_NAME,
    agent_alias_id=config.SOLAR_AGENT_ALIAS_ID,
    routing_instruction="""Assign solar panel-related inquiries and issues to the Solar Panel Agent, respecting its scope and support ticket protocol.""",
    relay_conversationHistory="TO_COLLABORATOR",
)

peak_agent = CollaboratorAgent(
    agent_name=config.PEAK_AGENT_NAME,
    agent_alias_id=config.PEAK_AGENT_ALIAS_ID,
    routing_instruction="""Direct peak load management and energy optimization tasks to the Peak Load Manager Agent, leveraging its analytical capabilities.""",
    relay_conversationHistory="TO_COLLABORATOR",
)'''

# Function to configure SSL settings for boto3/bedrock
async def configure_ssl_settings():
    # Disable SSL verification for boto3 (only for testing)
    import os
    import boto3
    import botocore.config
    import ssl
    
    # Set environment variables
    os.environ["AWS_VERIFY_SSL"] = "FALSE"
    
    # Configure botocore to not verify SSL
    # Create a default config that disables SSL verification
    boto_config = botocore.config.Config(
        connect_timeout=10, 
        read_timeout=10,
        retries={'max_attempts': 3},
        signature_version='v4'  # Use v4 signature for Bedrock
    )
    
    # Set the SSL verification off globally
    from botocore.httpsession import URLLib3Session
    URLLib3Session.verify = False
    
    # Monkey patch the InlineAgent class to use the SSL-disabled configuration
    original_init = InlineAgent.__init__
    
    def patched_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        if hasattr(self, '_bedrock_agent_runtime') and self._bedrock_agent_runtime:
            # Force the client to use unverified HTTPS
            self._bedrock_agent_runtime._endpoint.http_session.verify = False
    
    InlineAgent.__init__ = patched_init
    
    # Patch urllib3 again to disable warnings and verification
    urllib3.disable_warnings()
    
    # Patch SSL context
    try:
        _create_unverified_https_context = ssl._create_unverified_context
    except AttributeError:
        pass
    else:
        ssl._create_default_https_context = _create_unverified_https_context

# Global variable to store MCP client instances
_mcp_clients = {}

# Function to create the perplexity action group
async def create_perplexity_action_group():
    # Check if we already have a client
    if 'perplexity' in _mcp_clients and _mcp_clients['perplexity'] is not None:
        # Reuse existing client
        preplexity_mcp_client = _mcp_clients['perplexity']
        print("Connected to server with tools:['perplexity_ask', 'perplexity_research', 'perplexity_reason']")
    else:
        # Create new client
        server_params = StdioServerParameters(
            command="docker",
            args=["run", "-i", "--rm", "-e", "PERPLEXITY_API_KEY", "mcp/perplexity-ask"],
            env={"PERPLEXITY_API_KEY": config.PERPLEXITY_API_KEY},
        )

        # Create and initialize the client
        preplexity_mcp_client = await MCPStdio.create(server_params=server_params)
        _mcp_clients['perplexity'] = preplexity_mcp_client
        
        # Log available tools - hardcoded list since get_tools is not available
        print("Connected to server with tools:['perplexity_ask', 'perplexity_research', 'perplexity_reason']")
    
    # Create action group with the client
    preplexity_action_group = ActionGroup(
        name="SearchActionGroup",
        description="This action group is responsible for searching the internet for information.",
        mcp_clients=[preplexity_mcp_client],
    )
    
    return preplexity_action_group, preplexity_mcp_client

# Function to cleanup MCP clients
async def cleanup_mcp_clients():
    """Clean up all MCP clients properly"""
    for client_name, client in list(_mcp_clients.items()):
        if client is not None:
            try:
                await client.cleanup()
                _mcp_clients[client_name] = None
                print(f"Cleaned up {client_name} MCP client")
            except Exception as e:
                print(f"Error cleaning up {client_name} MCP client: {e}")

# Function to initialize the supervisor agent (for API use)
async def initialize_supervisor_agent():
    # Configure SSL settings
    await configure_ssl_settings()
    
    # Create perplexity action group
    preplexity_action_group, _ = await create_perplexity_action_group()
    
    # Create the supervisor agent
    supervisor = InlineAgent(
        foundation_model="us.amazon.nova-pro-v1:0",
        instruction=SUPERVISOR_AGENT_INSTRUCTIONS,
        agent_name="supervisor_agent",
        action_groups=[preplexity_action_group],
        collaborators=[itinerary_agent],
        agent_collaboration="SUPERVISOR",
    )
    
    return supervisor

# Function to process a single message with the supervisor agent and cleanup properly
async def process_message(message, session_id):
    """Process a single message with the supervisor agent and clean up properly"""
    try:
        # Log session ID for debugging
        print(f"SessionId: {session_id}")
        
        # Initialize the agent
        supervisor = await initialize_supervisor_agent()
        
        # Process the message
        response = await supervisor.invoke(
            input_text=message,
            session_id=session_id
        )
        
        # Process the response to make it more suitable for end users
        # Option 1: Extract just the Bot response if present
        if "Bot:" in response:
            response = response.split("Bot:", 1)[1].strip()
        
        # Option 2: Remove thought process lines if present
        elif "Thought:" in response:
            # Remove lines starting with Thought: and keeping everything after the last occurrence
            lines = response.split('\n')
            result_lines = []
            for line in lines:
                if line.strip().startswith('Thought:') or 'tool provided' in line:
                    continue
                result_lines.append(line)
            
            # Join non-thought lines back
            response = '\n'.join(result_lines).strip()
        
        return response
    finally:
        # Always clean up MCP clients to prevent resource leaks
        await cleanup_mcp_clients()

# Run the main application without the observe decorator
async def main():
    # Configure SSL settings
    await configure_ssl_settings()
    
    # Create perplexity action group
    preplexity_action_group, preplexity_mcp_client = await create_perplexity_action_group()
    
    try:
        # Create the supervisor agent
        supervisor = InlineAgent(
            foundation_model="us.amazon.nova-pro-v1:0",
            instruction=SUPERVISOR_AGENT_INSTRUCTIONS,
            agent_name="supervisor_agent",
            action_groups=[preplexity_action_group],
            collaborators=[itinerary_agent],
            agent_collaboration="SUPERVISOR"
        )
        
        session_id = str(uuid.uuid4())
        
        while True:
            user_query = input("Assistant: How can I help you?\n")

            # Directly call supervisor.invoke without the observability wrapper
            # We'll add observability at a different level if needed later
            await supervisor.invoke(
                input_text=user_query,
                session_id=session_id
            )

    finally:
        await preplexity_mcp_client.cleanup()


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())