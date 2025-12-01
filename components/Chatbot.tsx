
import React, { useState, useRef, useEffect } from 'react';
import { ChatBubbleIcon, CloseIcon, SendIcon } from './icons';
import { ChatMessage } from '../types';

interface ChatbotProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isBotTyping: boolean;
}

export const Chatbot: React.FC<ChatbotProps> = ({ messages, onSendMessage, isBotTyping }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isBotTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && !isBotTyping) {
      onSendMessage(userInput);
      setUserInput('');
    }
  };
  
  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-pink-500 to-violet-500 text-white w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-violet-300"
        aria-label="Toggle Chat"
      >
        {isOpen ? <CloseIcon className="w-8 h-8" /> : <ChatBubbleIcon className="w-8 h-8" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-full max-w-sm h-[60vh] bg-white rounded-2xl shadow-xl flex flex-col border border-gray-200 transition-opacity duration-300 ease-in-out">
          <header className="bg-gray-100 p-4 rounded-t-2xl border-b">
            <h3 className="font-bold text-gray-800 text-lg">Helpful Assistant</h3>
            <p className="text-sm text-gray-500">Ask me anything!</p>
          </header>

          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            <div className="flex flex-col gap-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-xs px-4 py-2 rounded-2xl ${
                      msg.role === 'user' ? 'bg-violet-500 text-white rounded-br-lg' : 'bg-gray-200 text-gray-800 rounded-bl-lg'
                    }`}
                  >
                    <p className="text-sm break-words">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isBotTyping && (
                  <div className="flex justify-start">
                      <div className="px-4 py-2 rounded-2xl bg-gray-200 text-gray-800 rounded-bl-lg">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                          </div>
                      </div>
                  </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 border-t bg-white rounded-b-2xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
                disabled={isBotTyping}
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isBotTyping}
                className="p-2 rounded-full bg-violet-500 text-white disabled:bg-gray-300 transition-colors"
                aria-label="Send message"
              >
                <SendIcon className="w-6 h-6" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};
