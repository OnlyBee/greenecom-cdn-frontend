
import React, { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      setApiKey('');
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-base-200 rounded-2xl shadow-xl p-8 max-w-lg w-full text-center transform transition-all">
        <h2 className="text-2xl font-bold text-white mb-4">Enter Your Gemini API Key</h2>
        <p className="text-base-content mb-6">
          To use this application, you need to provide your own Google Gemini API key. Your key is stored securely in your browser and is never sent to our servers.
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your API key here"
          className="w-full px-4 py-3 bg-base-300 border border-base-100 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-300 shadow-lg disabled:bg-base-300 disabled:cursor-not-allowed"
          >
            Save and Continue
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-6">
          Don't have a key? Get one from{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-secondary hover:underline"
          >
            Google AI Studio
          </a>.
        </p>
      </div>
    </div>
  );
};
