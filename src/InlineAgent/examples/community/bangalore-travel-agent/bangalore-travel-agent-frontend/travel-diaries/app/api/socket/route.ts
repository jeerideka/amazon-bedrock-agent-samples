import { Server as SocketIOServer } from 'socket.io';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Store the WebSocket server instance
let io: any;

// Map to track active socket connections by sessionId
const socketsBySession = new Map<string, string>();

// Create a global log buffer for each session
const sessionLogs = new Map<string, string[]>();

export function GET(req: NextRequest) {
  // This endpoint is just for health checking
  return NextResponse.json({ status: 'Socket server is running' });
}

// Initialize the Socket.IO server
export function getSocketIO() {
  if (!io) {
    // Create a new server instance if it doesn't exist
    const { createServer } = require('http');
    const httpServer = createServer();
    
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    
    // Start listening on port 3001
    httpServer.listen(3001, () => {
      console.log('Socket.IO server listening on port 3001');
    });
    
    // Set up connection event handlers
    io.on('connection', (socket: any) => {
      console.log('New client connected:', socket.id);
      
      // Client registers its session ID
      socket.on('register_session', (sessionId: string) => {
        console.log(`Session ${sessionId} registered with socket ${socket.id}`);
        socketsBySession.set(sessionId, socket.id);
        
        // Initialize logs array for this session if needed
        if (!sessionLogs.has(sessionId)) {
          sessionLogs.set(sessionId, []);
        }
        
        // Send any existing logs for this session
        const logs = sessionLogs.get(sessionId) || [];
        if (logs.length > 0) {
          socket.emit('logs', logs);
        }
      });
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Remove this socket from session mappings
        for (const [sessionId, socketId] of socketsBySession.entries()) {
          if (socketId === socket.id) {
            socketsBySession.delete(sessionId);
            break;
          }
        }
      });
    });
  }
  
  return io;
}

// Function to send logs to a specific session
export function sendLogsToSession(sessionId: string, log: string) {
  const io = getSocketIO();
  const socketId = socketsBySession.get(sessionId);
  
  // Store log in the session's log buffer
  if (!sessionLogs.has(sessionId)) {
    sessionLogs.set(sessionId, []);
  }
  
  const logs = sessionLogs.get(sessionId)!;
  logs.push(log);
  
  // Trim logs if they get too large
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000);
  }
  
  // Send to specific client if connected
  if (socketId) {
    io.to(socketId).emit('logs', [log]);
  }
  
  // Also broadcast to any clients listening for all logs
  io.emit('all_logs', { sessionId, log });
}

// Initialize the socket server
getSocketIO();

export const config = {
  runtime: 'nodejs',
};
