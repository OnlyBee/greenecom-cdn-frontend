
import React, { useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

export const PodApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSave = () => {
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      setApiKey('');
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center transform transition-all border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4">Enter Your Gemini API Key</h2>
        <p className="text-gray-300 mb-6">
          To use POD Power features, you need to provide your own Google Gemini API key. Your key is stored securely in your browser and is never sent to our servers.
        </p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your API key here"
          className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={handleSave}
            disabled={!apiKey.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-300 shadow-lg disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed"
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
            className="text-purple-400 hover:underline"
          >
            Google AI Studio
          </a>.
        </p>
      </div>
    </div>
  );
};
