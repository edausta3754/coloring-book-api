
import React, { useState, useCallback } from 'react';
import { ColoringBookGenerator } from './components/ColoringBookGenerator';
import { Chatbot } from './components/Chatbot';
import { generateColoringPages, getChatResponse } from './services/geminiService';
import { createColoringBookPdf } from './services/pdfService';
import { ChatMessage } from './types';

function App() {
  // State for Coloring Book Generator
  const [theme, setTheme] = useState<string>('Magical Forest Animals');
  const [childName, setChildName] = useState<string>('Alex');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  
  // State for Chatbot
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello! I'm here to help. Ask me anything about creating a coloring book or any other topic!" }
  ]);
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);

  const handleGenerate = useCallback(async () => {
    if (!theme.trim() || !childName.trim()) {
      setError("Please provide both a name and a theme.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setCoverImage(null);
    setPages([]);

    try {
      const result = await generateColoringPages(theme, childName, setLoadingMessage);
      setCoverImage(result.coverImage);
      setPages(result.pages);
    } catch (e: any) {
      console.error(e);
      setError(`Failed to generate coloring book. Please try again. Details: ${e.message}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [theme, childName]);

  const handleDownload = useCallback(() => {
    if (coverImage && pages.length > 0) {
      createColoringBookPdf(coverImage, pages, childName, theme);
    }
  }, [coverImage, pages, childName, theme]);

  const handleSendMessage = useCallback(async (message: string) => {
      const newUserMessage: ChatMessage = { role: 'user', text: message };
      setChatMessages(prev => [...prev, newUserMessage]);
      setIsBotTyping(true);

      try {
        const responseText = await getChatResponse([...chatMessages, newUserMessage], message);
        const newBotMessage: ChatMessage = { role: 'model', text: responseText };
        setChatMessages(prev => [...prev, newBotMessage]);
      } catch (e: any) {
        console.error("Chat error:", e);
        const errorMessage: ChatMessage = { role: 'model', text: "Sorry, I encountered an error. Please try again." };
        setChatMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsBotTyping(false);
      }
  }, [chatMessages]);

  return (
    <div className="min-h-screen bg-rose-50 font-sans">
      <main>
        <ColoringBookGenerator
          theme={theme}
          setTheme={setTheme}
          childName={childName}
          setChildName={setChildName}
          handleGenerate={handleGenerate}
          handleDownload={handleDownload}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          error={error}
          coverImage={coverImage}
          pages={pages}
        />
      </main>
      <Chatbot 
        messages={chatMessages} 
        onSendMessage={handleSendMessage} 
        isBotTyping={isBotTyping} 
      />
    </div>
  );
}

export default App;
