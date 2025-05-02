'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// Dynamic import of ChatBot to avoid SSR issues with browser-only APIs
const ChatBot = dynamic(() => import('./ChatBot'), { ssr: false });

export default function ChatBotWrapper() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* Floating chat window */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white/80 backdrop-filter backdrop-blur-sm rounded-lg overflow-hidden shadow-xl w-full max-w-[1200px] h-[80vh] flex flex-col relative">
            <ChatBot onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}

      {/* Toggle button (visible when chat is closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-pink-500 text-white rounded-full p-4 shadow-lg hover:bg-pink-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}
    </>
  );
}
