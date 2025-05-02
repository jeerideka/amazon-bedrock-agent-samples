import { NextRequest, NextResponse } from 'next/server';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { addLog } from '../logs/route';

const execPromise = promisify(exec);

// Map to store session IDs for each user
const sessionMap = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const { message, userId } = await request.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // Create or retrieve session ID for this user
    if (!sessionMap.has(userId)) {
      sessionMap.set(userId, uuidv4());
    }
    const sessionId = sessionMap.get(userId);
    
    // Path to the Python script
    const scriptPath = process.env.INLINE_AGENT_SCRIPT_PATH || 
      '/Users/jeerid/amazon-bedrock-agent-samples/src/InlineAgent/examples/community/bangalore-travel-agent/main.py';
    
    // Run the Python script with the input - using python3 which is more likely to be available on macOS
    try {
      // Properly escape the user message to avoid command injection issues
      const escapedMessage = message.replace(/["'\\]/g, (char: string) => '\\' + char);
      
      // Create a Python script file that will be executed
      const tempScriptPath = `/tmp/agent_script_${Date.now()}.py`;
      
      // Get environment variables from process.env that need to be passed to the Python script
      const envVars = {
        'AWS_ACCESS_KEY_ID': process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
        'AWS_SECRET_ACCESS_KEY': process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
        'AWS_REGION': process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
        'PERPLEXITY_API_KEY': process.env.PERPLEXITY_API_KEY || ''
      };
      
      // Create environment variables string for the script execution
      const envString = Object.entries(envVars)
        .filter(([_, value]) => value) // Only include non-empty values
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');
      
      // Create a Python script file that will be executed - with more direct execution approach
      await execPromise(`cat > ${tempScriptPath} << 'EOF'
import asyncio
import sys
import json
import os
import logging

# Configure logging to include timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('inline-agent')

# Add script directory to path
sys.path.append(os.path.dirname("${scriptPath}"))

# Import the main module directly
from main import process_message

async def invoke_agent():
    try:
        logger.info(f"Starting inline agent processing for session {repr('${sessionId}')}, message: {repr('${escapedMessage}'[:30] + '...' if len('${escapedMessage}') > 30 else '${escapedMessage}')}") 
        
        # Execute process_message with the input message and session ID
        response = await process_message(
            message="${escapedMessage}",
            session_id="${sessionId}"
        )
        
        logger.info(f"Agent processing complete, response length: {len(response) if response else 0}")
        
        # Print response as JSON for parsing
        result = {"response": response}
        print("FINAL_RESULT: " + json.dumps(result))
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        logger.error(f"Agent error: {str(e)}")
        logger.error(error_traceback)
        print("FINAL_ERROR: " + json.dumps({"error": str(e), "traceback": error_traceback}))

# Run the async function
asyncio.run(invoke_agent())
EOF`);
      
      // Set environment variables for the Python process
      const env = {
        ...process.env,
        ...(envString.split(' ').reduce<Record<string, string>>((acc, val) => {
          const [key, value] = val.split('=');
          if (key && value) {
            acc[key] = value.replace(/"/g, '');
          }
          return acc;
        }, {})),
      };

      // Use spawn instead of exec to stream output in real-time
      console.log('🔵 Starting inline agent with session ID:', sessionId);
      console.log(`🔵 Using Python script: ${tempScriptPath}`);
      
      let stdoutData = '';
      let stderrData = '';
      
      const pythonProcess = spawn('python3', [tempScriptPath], {
        cwd: path.dirname(scriptPath),
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Stream stdout in real-time to console with timestamps and to WebSocket
      pythonProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        const timestamp = new Date().toISOString();
        stdoutData += chunk;
        const logMessage = `🟢 [${timestamp}] INLINE-AGENT stdout: ${chunk.trim()}`;
        console.log(logMessage);
        // Store log in logs API
        if (sessionId) {
          addLog(sessionId, logMessage);
        }
      });
      
      // Stream stderr in real-time to console with timestamps and to WebSocket
      pythonProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        const timestamp = new Date().toISOString();
        stderrData += chunk;
        const logMessage = `🔴 [${timestamp}] INLINE-AGENT stderr: ${chunk.trim()}`;
        console.log(logMessage);
        // Store log in logs API
        if (sessionId) {
          addLog(sessionId, logMessage);
        }
      });
      
      // Wait for process to complete
      const exitCode = await new Promise((resolve) => {
        pythonProcess.on('close', resolve);
      });
      
      const exitMessage = `🟣 Python process exited with code ${exitCode}`;
      console.log(exitMessage);
      if (sessionId) {
        addLog(sessionId, exitMessage);
      }
      
      // Log completion
      const stdout = stdoutData;
      const stderr = stderrData;
      
      // Clean up the temporary script
      await execPromise(`rm ${tempScriptPath}`).catch(e => console.warn('Failed to clean up temp file:', e));
      
      // Check if stderr contains real errors or just the Perplexity MCP startup message
      // The Perplexity MCP server outputs its startup message to stderr, but it's not an error
      const isFatalError = stderr && 
          !stderr.includes('Perplexity MCP Server running on stdio') && 
          !stderr.includes('Found credentials in shared credentials file') &&
          exitCode !== 0;
          
      if (isFatalError) {
        const errorMessage = '❌ Error executing Python script [EXIT CODE ' + exitCode + ']: ' + stderr;
        console.error(errorMessage);
        if (sessionId) {
          addLog(sessionId, errorMessage);
        }
        return NextResponse.json({ error: 'Error executing script', details: stderr }, { status: 500 });
      }
      
      try {
        // The Python output might contain debug information before the JSON
        // We need to find and extract just the JSON part
        const parseMessage = '🔍 Attempting to parse agent response from output';
        console.log(parseMessage);
        if (sessionId) {
          addLog(sessionId, parseMessage);
        }
        
        // Look for the FINAL_RESULT marker first
        const resultMatch = stdout.match(/FINAL_RESULT: (\{.*\})/);
        if (resultMatch && resultMatch[1]) {
          const jsonStr = resultMatch[1];
          console.log('✅ Found JSON response from FINAL_RESULT marker:', jsonStr);
          try {
            const result = JSON.parse(jsonStr);
            console.log('✅ Successfully parsed response');
            return NextResponse.json({ response: result.response, sessionId });
          } catch (parseError) {
            console.error('🔴 Error parsing JSON from FINAL_RESULT:', parseError);
          }
        }
        
        // If no FINAL_RESULT, check for FINAL_ERROR marker
        const errorMatch = stdout.match(/FINAL_ERROR: (\{.*\})/);
        if (errorMatch && errorMatch[1]) {
          console.log('⚠️ Found error JSON from FINAL_ERROR marker:', errorMatch[1]);
          try {
            const errorJson = JSON.parse(errorMatch[1]);
            return NextResponse.json({ 
              error: errorJson.error, 
              sessionId 
            }, { status: 500 });
          } catch (parseError) {
            console.error('🔴 Error parsing JSON from FINAL_ERROR:', parseError);
          }
        }
        
        // Fallback to the older patterns if markers not found
        const jsonMatch = stdout.match(/\{"response":.*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          console.log('✅ Found JSON response with legacy pattern:', jsonStr);
          try {
            const result = JSON.parse(jsonStr);
            console.log('✅ Successfully parsed response');
            return NextResponse.json({ response: result.response, sessionId });
          } catch (parseError) {
            console.error('🔴 Error parsing JSON with legacy pattern:', parseError);
          }
        } 
        
        // Last try for error objects with legacy pattern
        const legacyErrorMatch = stdout.match(/\{"error":.*\}/);
        if (legacyErrorMatch) {
          console.log('⚠️ Found error JSON with legacy pattern:', legacyErrorMatch[0]);
          try {
            const errorJson = JSON.parse(legacyErrorMatch[0]);
            return NextResponse.json({ 
              error: errorJson.error, 
              sessionId 
            }, { status: 500 });
          } catch (parseError) {
            console.error('🔴 Error parsing JSON with legacy pattern:', parseError);
          }
        }
        
        // If we reach here, we couldn't find a valid JSON response
        // If we can't find a valid JSON response, extract just the last few lines
        // which might contain the bot response
        const lines = stdout.split('\n');
        const lastLines = lines.slice(-10).join('\n');
        
        // Look for "Bot:" in the output as a fallback
        console.log('⚠️ Looking for "Bot:" prefix in output as fallback');
        const botMessageMatch = stdout.match(/Bot: (.*?)(?=\n|$)/);
        if (botMessageMatch) {
          console.log('✅ Found "Bot:" response:', botMessageMatch[1]);
          return NextResponse.json({ 
            response: botMessageMatch[1],
            sessionId
          });
        }
        
        // Final fallback: return the last non-empty line
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim()) {
            return NextResponse.json({ 
              response: lines[i],
              sessionId
            });
          }
        }
        
        throw new Error('Could not extract response from output');
      } catch (e) {
        console.error('Error parsing script output:', e, 'raw output:', stdout);
        return NextResponse.json({ 
          error: 'Error parsing script output', 
          rawOutput: stdout.slice(-1000) // Limit the output size
        }, { status: 500 });
      }
    } catch (execError: any) {
      console.error('Error executing Python script:', execError);
      return NextResponse.json({
        error: 'Failed to execute Python script',
        details: execError.message,
        code: execError.code
      }, { status: 500 });
    }
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
