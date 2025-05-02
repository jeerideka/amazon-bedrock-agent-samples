import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (sessionId: string) => {
  if (!socket) {
    // Get the socket.io client script from the current origin
    // This is a simpler alternative approach that doesn't require a separate WebSocket server
    const baseUrl = window.location.origin;
    
    try {
      console.log('Initializing log monitoring for session', sessionId);
      
      // Instead of using real-time WebSockets, we'll monitor logs through polling
      // This is a simple alternative that will work in the Next.js environment
      // without needing a separate WebSocket server
      
      // For now, we'll use a mock socket that just has the interface we need
      // but doesn't actually connect to a server
      const mockSocket = {
        id: `mock-socket-${Math.random().toString(36).substring(2, 9)}`,
        connected: true,
        listeners: new Map<string, Function[]>(),
        on: function(event: string, callback: Function) {
          if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
          }
          this.listeners.get(event)!.push(callback);
          return this;
        },
        emit: function(event: string, ...args: any[]) {
          console.log(`Mock socket emitting ${event}`, args);
          return this;
        },
        off: function(event: string, callback?: Function) {
          if (callback && this.listeners.has(event)) {
            const callbacks = this.listeners.get(event)!;
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
              callbacks.splice(index, 1);
            }
          } else if (this.listeners.has(event)) {
            this.listeners.delete(event);
          }
          return this;
        },
        disconnect: function() {
          this.connected = false;
          return this;
        }
      };
      
      socket = mockSocket as unknown as Socket;
      
      // Trigger connect event for any listeners
      const connectListeners = mockSocket.listeners.get('connect') || [];
      connectListeners.forEach(callback => callback());
    } catch (err) {
      console.error('Error setting up log monitoring:', err);
    }
  }
  
  return socket;
};

export const getSocket = () => socket;

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
