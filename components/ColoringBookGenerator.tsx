
import React from 'react';
import { MagicWandIcon, DownloadIcon, SpinnerIcon } from './icons';

interface ColoringBookGeneratorProps {
  theme: string;
  setTheme: (theme: string) => void;
  childName: string;
  setChildName: (name: string) => void;
  handleGenerate: () => void;
  handleDownload: () => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  coverImage: string | null;
  pages: string[];
}

export const ColoringBookGenerator: React.FC<ColoringBookGeneratorProps> = ({
  theme,
  setTheme,
  childName,
  setChildName,
  handleGenerate,
  handleDownload,
  isLoading,
  loadingMessage,
  error,
  coverImage,
  pages,
}) => {
  const canGenerate = theme.trim().length > 2 && childName.trim().length > 1 && !isLoading;
  const canDownload = !isLoading && coverImage && pages.length > 0;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
          My Coloring Book Creator
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Turn your wildest ideas into beautiful, printable coloring pages for your little artist.
        </p>
      </header>
      
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="childName" className="block text-sm font-medium text-gray-700 mb-1">Child's Name</label>
            <input
              type="text"
              id="childName"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="e.g., Lily"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
            />
          </div>
          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-1">Coloring Book Theme</label>
            <input
              type="text"
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., Space Dinosaurs"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition"
            />
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
        >
          <MagicWandIcon className="w-5 h-5" />
          {isLoading ? 'Creating Magic...' : 'Generate My Coloring Book'}
        </button>
      </div>

      {isLoading && (
        <div className="text-center mt-8 p-6 bg-violet-100 rounded-lg max-w-md mx-auto">
          <SpinnerIcon />
          <p className="text-violet-800 font-medium mt-4 animate-pulse">{loadingMessage}</p>
        </div>
      )}

      {error && (
        <div className="text-center my-8 p-4 bg-red-100 text-red-700 rounded-lg max-w-2xl mx-auto">
          <p><strong>Oh no! Something went wrong.</strong></p>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && coverImage && pages.length > 0 && (
        <div className="mt-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800">Your Coloring Book is Ready!</h2>
            <button
              onClick={handleDownload}
              disabled={!canDownload}
              className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition-transform transform hover:scale-105"
            >
              <DownloadIcon className="w-5 h-5" />
              Download as PDF
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-lg shadow-lg overflow-hidden border border-gray-200 bg-white">
              <img src={`data:image/jpeg;base64,${coverImage}`} alt="Coloring book cover" className="w-full h-auto object-cover" />
              <p className="text-center p-2 font-semibold text-gray-700">Cover Page</p>
            </div>
            {pages.map((page, index) => (
              <div key={index} className="rounded-lg shadow-lg overflow-hidden border border-gray-200 bg-white">
                <img src={`data:image/jpeg;base64,${page}`} alt={`Coloring page ${index + 1}`} className="w-full h-auto object-cover" />
                <p className="text-center p-2 font-semibold text-gray-700">Page {index + 1}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
