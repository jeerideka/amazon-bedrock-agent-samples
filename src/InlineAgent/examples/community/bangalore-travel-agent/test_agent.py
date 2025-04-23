#!/usr/bin/env python3
import asyncio
import sys
import json
import uuid
from main import process_message

async def test_agent():
    try:
        # Default message if none provided
        message = sys.argv[1] if len(sys.argv) > 1 else "Tell me about Bangalore"
        session_id = str(uuid.uuid4())
        
        print(f"Sending message to agent: '{message}'")
        print(f"Session ID: {session_id}")
        
        print("Processing message with agent...")
        response = await process_message(message, session_id)
        
        print("\nResponse from agent:")
        print("-" * 50)
        print(response)
        print("-" * 50)
        
        # Return in JSON format for programmatic use if needed
        print("\nJSON response:")
        print(json.dumps({"response": response}))
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

if __name__ == "__main__":
    asyncio.run(test_agent())
