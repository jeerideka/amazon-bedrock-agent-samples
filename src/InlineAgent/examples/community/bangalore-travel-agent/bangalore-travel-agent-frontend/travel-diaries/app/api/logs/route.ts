import { NextRequest, NextResponse } from 'next/server';

// Store logs by session
const sessionLogs = new Map<string, string[]>();

export async function GET(request: NextRequest) {
  // Get session ID from query params
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }
  
  // Return logs for this session
  const logs = sessionLogs.get(sessionId) || [];
  return NextResponse.json({ logs });
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, log } = await request.json();
    
    if (!sessionId || !log) {
      return NextResponse.json({ error: 'Session ID and log are required' }, { status: 400 });
    }
    
    // Add log to session
    if (!sessionLogs.has(sessionId)) {
      sessionLogs.set(sessionId, []);
    }
    
    sessionLogs.get(sessionId)!.push(log);
    
    // Keep logs trimmed to last 1000 entries
    const logs = sessionLogs.get(sessionId)!;
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding log:', error);
    return NextResponse.json({ error: 'Failed to add log' }, { status: 500 });
  }
}

// Export a function to add logs for use within the API routes
export function addLog(sessionId: string, log: string) {
  if (!sessionId) return;
  
  // Initialize logs array if needed
  if (!sessionLogs.has(sessionId)) {
    sessionLogs.set(sessionId, []);
  }
  
  // Add log
  sessionLogs.get(sessionId)!.push(log);
  
  // Trim logs if they get too large
  const logs = sessionLogs.get(sessionId)!;
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000);
  }
}

// Clear logs for a session
export function clearLogs(sessionId: string) {
  if (sessionLogs.has(sessionId)) {
    sessionLogs.set(sessionId, []);
  }
}
