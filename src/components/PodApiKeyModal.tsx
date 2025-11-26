import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  isAdmin: boolean;
}

export const PodApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, isAdmin }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');

  const handleSave = () => {
    if (apiKeyInput.trim()) {
      onSave(apiKeyInput.trim());
      setApiKeyInput('');
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center transform transition-all border border-gray-700">
        
        {isAdmin ? (
          <>
            <h2 className="text-2xl font-bold text-white mb-4">Enter Gemini API Key</h2>
            <p className="text-gray-400 mb-6 text-sm">This key is required for POD Power features and will be stored locally on your browser.</p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste your API key here"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="mt-6">
              <button
                onClick={handleSave}
                disabled={!apiKeyInput.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg w-full"
              >
                Save and Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">API Key Required</h2>
            <p className="text-gray-300 mb-6">The Gemini API key has not been configured for this tool.</p>
            <p className="text-gray-400 text-lg">Please contact an <span className="font-bold text-white">Administrator</span> to set up the API key.</p>
          </>
        )}

      </div>
    </div>
  );
};
