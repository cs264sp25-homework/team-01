import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/ui/button';       
import { Input } from '@/ui/input';        
import { ScrollArea } from '@/ui/scroll-area'; 
import { useAction } from 'convex/react'; // Import useAction
import { api } from '../../convex/_generated/api'; // Import api
import { Id } from "../../convex/_generated/dataModel"; // Import Id
import { useNavigate } from 'react-router-dom'; // Import for linking

interface AskAIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SourceNote {
  id: Id<"notes">;
  title: string;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
  sources?: SourceNote[]; // Optional sources for AI messages
}

export function AskAIModal({ isOpen, onClose }: AskAIModalProps) {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]); 
  const [isLoading, setIsLoading] = useState(false); 
  const askAIAction = useAction(api.chat.askAI); // Use the non-streaming action
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate(); // Hook for navigation

  const handleSend = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: query };
    setConversation(prev => [...prev, userMessage]);
    const currentQuery = query;
    setQuery('');
    setIsLoading(true);

    try {
      // Call the Convex action, expecting an object
      const result = await askAIAction({ query: currentQuery });
      // Separate response text and sources
      const aiResponse: Message = { 
        sender: 'ai', 
        text: result.response, 
        sources: result.sources 
      };
      setConversation(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error calling askAI action:", error);
      const errorResponse: Message = { 
        sender: 'ai', 
        text: "Sorry, I couldn't get a response. Please try again." 
        // No sources on error
      };
      setConversation(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when conversation updates
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversation]);

  // Clear conversation when modal opens
  useEffect(() => {
    if (isOpen) {
      setConversation([]);
      setQuery('');
    }
  }, [isOpen]);

  // Helper function to navigate to a note
  const handleSourceClick = (noteId: Id<"notes">) => {
    navigate(`/team-01/notes/${noteId}`);
    onClose(); // Close modal after clicking source
  };

  if (!isOpen) return null;

  // --- Render Logic (mostly same as before) ---
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="relative flex flex-col w-full max-w-2xl p-6 overflow-hidden bg-white rounded-lg shadow-xl h-4/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute z-10 text-gray-500 top-3 right-3 hover:text-gray-700"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Ask AI</h2>
        
        {/* Chat Area & Input */}
        <div className="flex flex-col flex-grow min-h-0"> 
          {/* Message Display Area */}
          <ScrollArea className="flex-grow pr-4 mb-4 -mr-4 border rounded-md" ref={scrollAreaRef}>
            <div className="p-4 space-y-4">
              {conversation.map((msg, index) => (
                <div key={index} className="mb-2"> { /* Wrapper for message and sources, added margin */}
                  <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-3 rounded-lg max-w-[80%] break-words ${ 
                      msg.sender === 'user' 
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {/* Render only the main AI text, assuming sources are not included by AI */}
                      <p className="text-sm text-left whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                  {/* Render sources as styled tags if they exist for an AI message */}
                  {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 ml-4"> {/* Use flex-wrap for tags, add margin */} 
                      <span className="self-center mr-1 text-xs font-semibold text-gray-500">Sources:</span> {/* Align label */} 
                      {msg.sources.map((source) => (
                        <button 
                          key={source.id} 
                          onClick={() => handleSourceClick(source.id)}
                          className="px-2 py-0.5 text-xs text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-300"
                          title={`Go to note: ${source.title}`}
                        >
                          {source.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* Loading indicator (text based for simplicity) */}
              {isLoading && (
                 <div className="flex justify-start">
                  <div className="flex items-center p-3 space-x-1 bg-gray-100 rounded-lg">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Input 
              type="text" 
              placeholder="Ask anything about your notes..." 
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !isLoading && handleSend()}
              disabled={isLoading}
              className="flex-grow"
            />
            <Button onClick={handleSend} disabled={isLoading || !query.trim()}>
              {isLoading ? 'Thinking...' : 'Send'} 
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 