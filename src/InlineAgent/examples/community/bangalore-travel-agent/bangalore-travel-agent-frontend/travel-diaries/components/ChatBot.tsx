'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';
import LogViewer from './LogViewer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  index?: number; // Position in the conversation
}

interface ChatBotProps {
  onClose?: () => void;
}

// Define agent constants
const AGENT_ALIAS_ID = 'TSTALIASID';
const AGENT_ID = '8L9UIVDXHW'; // Correct agent ID

// Configure AWS Bedrock client
const bedrockAgentClient = new BedrockAgentRuntimeClient({
  region: 'us-east-1', // Amazon Bedrock is commonly available in us-east-1
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || ''
  }
});

// Function to call our inline agent API
async function callInlineAgent(input: string, userId: string): Promise<{response: string, sessionId: string}> {
  try {
    console.log('Calling Inline Agent API with:', { input, userId });
    
    const response = await fetch('/api/inline-agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: input,
        userId: userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', errorText);
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Inline Agent response:', data);
    
    return {
      response: data.response || "I'm your Bangalore travel assistant. How can I help you today?",
      sessionId: data.sessionId || userId
    };
  } catch (error) {
    console.error('Error calling Inline Agent API:', error);
    return {
      response: "Sorry, I'm having trouble connecting to my backend. Please try again later.",
      sessionId: userId
    };
  }
}

// Legacy function for direct Bedrock calls (kept for reference)
async function callBedrockAgent(input: string, sessionId: string): Promise<string> {
  try {
    console.log('Calling Bedrock Agent with:', { input, sessionId, agentId: AGENT_ID, agentAliasId: AGENT_ALIAS_ID });
    
    const params = {
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId: sessionId,
      inputText: input,
      enableTrace: true // Enable tracing for debugging
    };

    console.log('Sending request to Bedrock Agent API...');
    const command = new InvokeAgentCommand(params);
    const response = await bedrockAgentClient.send(command);
    console.log('Bedrock response received:', typeof response.completion);
    
    // Handle the completion response, ensuring we return a string
    if (!response.completion) {
      console.warn('No completion in response');
      return '';
    }
    
    // For any type of response, try to convert it to a string
    try {
      // Direct string response (ideal case)
      if (typeof response.completion === 'string') {
        console.log('Received string completion');
        return response.completion;
      }
      
      // For AsyncIterable response
      if (Symbol.asyncIterator in response.completion) {
        console.log('Received AsyncIterable response');
        // We'll use a simple approach that returns a message about streaming not being supported
        // A full implementation would collect all chunks and concatenate them
        return "I'm ready to help you with information about Bangalore's attractions, food, and experiences!";
      }
      
      // JSON fallback for any other response type
      try {
        return JSON.stringify(response);
      } catch (e) {
        return "I'm your Bangalore travel assistant. How can I help you today?";
      }
    } catch (processingError) {
      console.error('Error processing Bedrock response:', processingError);
      return 'There was an error processing the response from Bedrock.';
    }
  } catch (error) {
    console.error('Error calling Bedrock Agent:', error);
    return '';
  }
}

// ElevenLabs API key - make sure this is your valid API key
const ELEVENLABS_API_KEY = "sk_2de2e2186ce4993862ad6afaaf6377cf2b0744628895bdc0";

// Voice ID for ElevenLabs - This is the "Shreyas" voice ID
const ELEVENLABS_VOICE_ID = "TRnaQb7q41oL7sV0w6Bu";

export default function ChatBot({ onClose }: ChatBotProps) {
  const [userId, setUserId] = useState(() => `user-${Math.random().toString(36).substring(2, 9)}`);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showLogs, setShowLogs] = useState(false);
  
  // Speech recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Audio references
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Manage loading state and messages
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Log messages when sessions are created/refreshed
  useEffect(() => {
    if (sessionId) {
      console.log(`Chat session active: ${sessionId}`);
    }
  }, [sessionId]);

  // Actual implementation of Web Speech API for voice recognition
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
      };
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.start();
      setIsListening(true);
    } else {
      alert('Speech recognition is not supported in your browser. Try Chrome or Edge.');
    }
  };
  
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };
  
  // Initialize audio element on component mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = onended;
      audioRef.current.onerror = onerror;
    }
  }, []);

  function onended() {
    setIsSpeaking(false);
  }
  
  function onerror() {
    console.error('Audio playback error');
    setIsSpeaking(false);
  }

  // Stop speech function
  function stopSpeaking() {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {
        console.error('Error stopping audio:', e);
      }
    }
    
    // Also stop any browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    setIsSpeaking(false);
  }

  // Text-to-speech implementation using browser's built-in speech synthesis
  // ElevenLabs integration is commented out to avoid charges during testing
  async function speakText(text: string) {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        stopSpeaking();
      }
      
      setIsSpeaking(true);
      
      try {
        // Call ElevenLabs API with proper error handling
        console.log('Calling ElevenLabs API with voice ID:', ELEVENLABS_VOICE_ID);
        
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`,
          {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
              }
            }),
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No error details');
          console.error(`ElevenLabs API error (${response.status}):`, errorText);
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }
        
        // Get the audio data
        const audioData = await response.arrayBuffer();
        
        // Create blob URL and play audio
        const blob = new Blob([audioData], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          return; // Success - exit function
        }
      } catch (apiError) {
        console.error('ElevenLabs API error:', apiError);
        
        // Fallback to browser speech synthesis
        console.log('Falling back to browser speech synthesis');
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.onend = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
          return; // Success with fallback
        } else {
          throw new Error('Browser speech synthesis not available');
        }
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
      setIsSpeaking(false);
      console.warn('Error generating speech. Using silent mode.');
    }
  };
  
  // Track if this is the initial render
  const isInitialRender = useRef(true);
  
  // Scroll to bottom when messages change and automatically speak the latest assistant message
  useEffect(() => {
    // Always scroll to bottom of messages
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Find the latest assistant message for auto speaking
    const latestMessage = messages[messages.length - 1];
    
    // Skip auto-speech on initial render
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    
    // Auto-speak the latest assistant message when it arrives
    if (latestMessage && latestMessage.role === 'assistant' && !isLoading) {
      speakText(latestMessage.content);
    }
  }, [messages, isLoading]);
  
  // Function to reset chat and create a new session
  const resetChat = useCallback(async () => {
    // Stop any active speech or listening
    if (isListening) {
      stopListening();
    }
    if (isSpeaking) {
      stopSpeaking();
    }
    
    // Generate new userId
    const newUserId = `user-${Math.random().toString(36).substring(2, 9)}`;
    setUserId(newUserId);
    setSessionId('');
    setInput('');
    
    // Reset messages with welcome
    setMessages([{
      role: 'assistant',
      content: "I'm your insider guide to the Garden City, running on cutting-edge AI. Whether you're craving the perfect masala dosa, hunting for hidden rooftop bars, or wondering which tech hub has the best coffee culture—I've got the local knowledge you need. Drop me your questions about Bangalore's vibrant food scenes, cultural hotspots, or those secret local experiences that never make the guidebooks. Let's make your time in India's innovation capital extraordinary."
    }]);
    console.log('New chat session created with ID:', newUserId);
  }, [isListening, isSpeaking]);

  // Function to format message content properly
  const formatMessageContent = (content: string): string => {
    let formatted = content;
    
    // Keep raw text format for the chat display (showing \n characters)
    // This matches the screenshot's raw text display
    return formatted;
  };

  // Function to clean agent response text
  const cleanResponseText = (text: string): string => {
    if (!text) return '';
    
    let cleaned = text;
    
    // Remove any AI-style prefixes that might be in the response
    const prefixesToRemove = [
      /^AI: /i,
      /^Assistant: /i,
      /^Bot: /i,
      /^Bangalore Travel Assistant: /i,
      /^Travel Assistant: /i
    ];
    
    for (const prefix of prefixesToRemove) {
      cleaned = cleaned.replace(prefix, '');
    }
    
    // Remove markdown-style thinking sections if present
    cleaned = cleaned.replace(/\[Thinking\](.*?)\[\/Thinking\]/gs, '');
    cleaned = cleaned.replace(/Thinking:(.*?)(?=Action:|Human:|$)/gs, '');
    
    // Remove any json-like or code block wrappers
    cleaned = cleaned.replace(/```json\s*([\s\S]*?)\s*```/g, '$1');
    cleaned = cleaned.replace(/```\s*([\s\S]*?)\s*```/g, '$1');
    
    // Remove extra newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Trim any whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Skip if empty or already loading
    if (!input.trim() || isLoading) return;
    
    // If this is the first interaction, clear the landing page
    if (showLandingPage) {
      setShowLandingPage(false);
    }
    
    // Add user message
    const userMessage = { role: 'user' as const, content: input, index: messages.length };
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input and set loading
    setInput('');
    setIsLoading(true);
    
    try {
      // Call the API
      const { response, sessionId: newSessionId } = await callInlineAgent(input, userId);
      
      // Update session ID if provided
      if (newSessionId) {
        setSessionId(newSessionId);
      }
      
      // Clean up and add the response
      const cleanedResponse = cleanResponseText(response);
      const assistantMessage = { role: 'assistant' as const, content: cleanedResponse };
      
      // Add to messages with index
      const newAssistantMessage = { ...assistantMessage, index: messages.length + 1 };
      setMessages(prev => [...prev, newAssistantMessage]);
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: "I'm having trouble connecting to my backend right now. Please try again in a moment." 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat container */}
      <div className="flex flex-col h-full w-full min-h-[1000px] min-w-[600px] bg-white/80 backdrop-filter backdrop-blur-sm" style={{ height: '80vh', width: '95%', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div className="bg-pink-500 text-white p-3 flex justify-between items-center">
          <h2 className="font-bold text-2xl">Bangalore Travel Assistant</h2>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Close dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[95%] px-3 py-2 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-pink-500 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}
              >
                {message.role === 'assistant' && message.index === 0 && (
                  <div className="text-sm text-gray-500 mb-1">powered by Amazon Bedrock. Ask me anything about food, attractions, or local experiences in Bangalore!</div>
                )}
                <div className="text-base whitespace-pre-wrap">
                  {message.content}
                </div>
                  
                {/* Text-to-speech button for assistant messages */}
                {message.role === 'assistant' && (
                  <div className="mt-2 flex justify-end">
                    {isSpeaking && index === messages.length - 1 ? (
                      <button 
                        onClick={stopSpeaking}
                        className="text-base bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors flex items-center space-x-1"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        <span>Stop Audio</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => speakText(message.content)}
                        className="text-base text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                        disabled={isSpeaking}
                      >
                        <span>🔊</span>
                        <span>{isSpeaking ? 'Speaking...' : 'Listen'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Logs toggle button */}
        <div className="border-t border-gray-200 p-2 flex justify-between items-center bg-white">
            <button
              onClick={() => setShowLogs(prev => !prev)}
              className="flex items-center justify-center text-base px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
            >
              <span className="mr-1">{showLogs ? '📉 Hide Logs' : '📈 Show Logs'}</span>
              {isLoading && (
                <span className="text-blue-500 animate-pulse ml-2">Processing...</span>
              )}
            </button>
            {messages.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    // Create a completely new session with a new user ID
                    const newUserId = `user-${Math.random().toString(36).substring(2, 9)}`;
                    console.log(`Creating new chat session with user ID: ${newUserId}`);
                    setUserId(newUserId);
                    setMessages([]);
                    setSessionId('');
                  }}
                  className="text-base px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-700"
                >
                  🔄 New Chat
                </button>
                <button
                  onClick={() => {
                    setMessages([]);
                    setSessionId('');
                    console.log(`Cleared chat for existing user: ${userId}`);
                  }}
                  className="text-base px-3 py-2 bg-red-100 hover:bg-red-200 rounded text-red-700"
                >
                  🗑️ Clear Chat
                </button>
              </div>
            )}
          </div>
        
        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex items-center space-x-2 bg-white">
            <button 
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`p-2 rounded-full ${isListening ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'} hover:bg-gray-200`}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 text-black placeholder-gray-500 text-lg"
              disabled={isListening}
            />
            <button 
              type="submit" 
              className="bg-pink-500 text-white p-2 rounded-full hover:bg-pink-600 flex-shrink-0"
              disabled={!input.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      
      <audio ref={audioRef} style={{ display: 'none' }} onEnded={onended} />
      
      {/* Log Viewer */}
      <LogViewer 
        isVisible={showLogs} 
        onClose={() => setShowLogs(false)} 
        sessionId={sessionId} 
      />
    </>
  );
}
