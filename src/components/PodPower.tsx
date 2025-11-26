import React, { useState, useEffect, useCallback } from 'react';
import { PodFeatureSelector } from './PodFeatureSelector';
import { PodVariationGenerator } from './PodVariationGenerator';
import { PodMockupRemaker } from './PodMockupRemaker';
import { PodApiKeyModal } from './PodApiKeyModal';
import { getApiKey, setApiKey as saveApiKey, clearApiKey } from '../utils/apiKey';
import type { Feature } from '../podTypes';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const PodPower: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<Feature>('variation');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const { user } = useAuth();

  const fetchStats = useCallback(() => {
      setLoadingStats(true);
      api.getStats().then(data => {
          if(Array.isArray(data)) setStats(data);
      }).catch(console.warn).finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    const existingKey = getApiKey();
    if (existingKey) {
      setApiKeyState(existingKey);
    } else {
      setIsApiKeyModalOpen(true);
    }
    fetchStats();
  }, [user, fetchStats]);

  const handleSaveApiKey = (key: string) => {
    saveApiKey(key);
    setApiKeyState(key);
    setIsApiKeyModalOpen(false);
  };

  const handleApiError = useCallback(() => {
    clearApiKey();
    setApiKeyState(null);
    setIsApiKeyModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen text-gray-100 font-sans relative pb-20">
      {(!apiKey || isApiKeyModalOpen) && (
          <PodApiKeyModal
            isOpen={true}
            onClose={() => { if (apiKey) setIsApiKeyModalOpen(false); }}
            onSave={handleSaveApiKey}
          />
      )}

      <div className="pb-8">
        <div className="text-center mb-8">
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-wider">
            POD POWER
            </h2>
            <p className="text-gray-400 mt-2 text-lg">AI Assistant for Variations & Professional Mockups</p>
        </div>

        <PodFeatureSelector
          selectedFeature={selectedFeature}
          onSelectFeature={setSelectedFeature}
        />
        
        <div className="mt-8">
          {selectedFeature === 'variation' && <PodVariationGenerator onApiError={handleApiError} />}
          {selectedFeature === 'mockup' && <PodMockupRemaker onApiError={handleApiError} />}
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="mt-16 border-t border-gray-700 pt-8">
          <div className="flex justify-between items-center mb-6 max-w-4xl mx-auto px-4">
            <h3 className="text-2xl font-bold text-white">Usage Statistics</h3>
            <button 
                onClick={fetchStats} 
                disabled={loadingStats}
                className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-gray-300 transition"
            >
                {loadingStats ? 'Refreshing...' : '↻ Refresh Stats'}
            </button>
          </div>
          
          <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden max-w-4xl mx-auto border border-gray-700">
              <table className="w-full text-left">
                  <thead className="bg-gray-700 text-gray-300 uppercase text-sm">
                      <tr>
                          <th className="px-6 py-4">User</th>
                          <th className="px-6 py-4">Variation</th>
                          <th className="px-6 py-4">Mockup</th>
                          <th className="px-6 py-4 text-right">Total</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 text-sm">
                      {stats.length > 0 ? stats.map((stat, idx) => (
                          <tr key={idx} className="hover:bg-gray-700/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-white">{stat.username}</td>
                              <td className="px-6 py-4 text-green-400 font-mono">{stat.variation_count || 0}</td>
                              <td className="px-6 py-4 text-purple-400 font-mono">{stat.mockup_count || 0}</td>
                              <td className="px-6 py-4 text-right font-bold text-white text-lg">{stat.total_count}</td>
                          </tr>
                      )) : (
                          <tr>
                              <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                  No usage recorded yet. Generate some images!
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default PodPower;