'use client';

import { useEffect, useState, useRef } from 'react';

interface LogViewerProps {
  isVisible: boolean;
  onClose: () => void;
  sessionId?: string;
}

const LogViewer = ({ isVisible, onClose, sessionId }: LogViewerProps) => {
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Poll for logs at regular intervals
  useEffect(() => {
    if (!isVisible || !sessionId) return;
    
    let isMounted = true;
    const pollInterval = 1000; // Poll every second
    let lastLogCount = 0;
    
    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/logs?sessionId=${sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch logs');
        
        const data = await response.json();
        if (isMounted && data.logs && data.logs.length > 0) {
          // Only update if we have new logs
          if (data.logs.length > lastLogCount) {
            // Get only the new logs
            const newLogs = data.logs.slice(lastLogCount);
            setLogs(prevLogs => [...prevLogs, ...newLogs]);
            lastLogCount = data.logs.length;
          }
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
      
      // Continue polling if component is still visible
      if (isMounted && isVisible) {
        setTimeout(fetchLogs, pollInterval);
      }
    };
    
    // Start polling
    fetchLogs();
    
    // Clean up
    return () => {
      isMounted = false;
    };
  }, [isVisible, sessionId]);
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);
  
  // Clear logs
  const clearLogs = async () => {
    setLogs([]);
    
    // Also clear logs on the server if we have a session ID
    if (sessionId) {
      try {
        await fetch('/api/logs/clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });
      } catch (error) {
        console.error('Error clearing logs:', error);
      }
    }
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 w-full max-w-5xl h-[80vh] rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between bg-gray-800 p-3 rounded-t-lg border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Agent Logs</h2>
          <div className="flex space-x-2">
            <label className="flex items-center text-white text-base">
              <input 
                type="checkbox" 
                checked={autoScroll} 
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="mr-2"
              />
              Auto-scroll
            </label>
            <button 
              onClick={clearLogs}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-base"
            >
              Clear
            </button>
            <button 
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-base"
            >
              Close
            </button>
          </div>
        </div>
        
        <div 
          ref={logContainerRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-base bg-gray-950 text-gray-300"
        >
          {logs.length === 0 ? (
            <div className="text-gray-500 italic text-base">No logs yet. Send a message to see agent activity.</div>
          ) : (
            logs.map((log, index) => (
              <div 
                key={index} 
                className="whitespace-pre-wrap mb-1 leading-tight"
                dangerouslySetInnerHTML={{ __html: formatLogMessage(log) }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to colorize and format log messages
const formatLogMessage = (message: string): string => {
  // Keep emoji at the beginning
  const colorMap: Record<string, string> = {
    '🟢': 'text-green-400',  // stdout
    '🔴': 'text-red-400',    // stderr
    '🟣': 'text-purple-400', // process
    '🔵': 'text-blue-400',   // info
    '🔍': 'text-yellow-400', // search/parse
    '✅': 'text-green-500',  // success
    '⚠️': 'text-yellow-500', // warning
    '❌': 'text-red-500',    // error
  };
  
  // Check if message starts with an emoji we recognize
  for (const [emoji, colorClass] of Object.entries(colorMap)) {
    if (message.startsWith(emoji)) {
      // Extract timestamp if present
      const timestampMatch = message.match(/\[(.*?)\]/);
      if (timestampMatch) {
        const timestamp = timestampMatch[0];
        const beforeTimestamp = message.substring(0, message.indexOf('['));
        const afterTimestamp = message.substring(message.indexOf(']') + 1);
        
        return `<span class="${colorClass}">${beforeTimestamp}</span><span class="text-gray-500">${timestamp}</span><span class="${colorClass}">${afterTimestamp}</span>`;
      }
      
      return `<span class="${colorClass}">${message}</span>`;
    }
  }
  
  // Default formatting if no emoji match
  return message;
};

export default LogViewer;
