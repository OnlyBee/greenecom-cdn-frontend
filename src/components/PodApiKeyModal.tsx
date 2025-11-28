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
        <h2 className="text-2xl font-bold text-white mb-2">Update Gemini API Key</h2>
        <p className="text-gray-400 text-sm mb-4">
            This key will be saved to the system and used by all members.
        </p>
        
        <input 
            type="password" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            placeholder="Paste new API key here" 
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
        />
        
        <div className="mt-6 flex gap-3">
          <button 
            onClick={onClose} 
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg w-1/3"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={!apiKey.trim()} 
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg w-2/3 disabled:opacity-50"
          >
            Save to System
          </button>
        </div>
      </div>
    </div>
  );
};