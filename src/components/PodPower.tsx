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

  const handleSelectFeature = (feat: Feature) => {
      setSelectedFeature(feat);
      fetchStats();
  };

  return (
    <div className="min-h-screen text-gray-100 font-sans relative pb-20">
      {(!apiKey || isApiKeyModalOpen) && (
          <PodApiKeyModal
            isOpen={true}
            onClose={() => { if (apiKey) setIsApiKeyModalOpen(false); }}
            onSave={handleSaveApiKey}
          />
      )}

      {/* STATS SECTION */}
      <div className="bg-gray-800 rounded-xl shadow-lg p-4 mb-8 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">📊 Team Usage Statistics</h3>
            <button 
                onClick={fetchStats} 
                disabled={loadingStats}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-gray-300 transition"
            >
                {loadingStats ? '...' : 'Refresh'}
            </button>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
                      <tr>
                          <th className="px-4 py-2">User</th>
                          <th className="px-4 py-2">Variation</th>
                          <th className="px-4 py-2">Mockup</th>
                          <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                      {stats.length > 0 ? stats.map((stat, idx) => (
                          <tr key={idx} className="hover:bg-gray-700/50">
                              <td className="px-4 py-2 font-medium text-white">{stat.username}</td>
                              <td className="px-4 py-2 text-green-400">{stat.variation_count || 0}</td>
                              <td className="px-4 py-2 text-purple-400">{stat.mockup_count || 0}</td>
                              <td className="px-4 py-2 text-right font-bold">{stat.total_count}</td>
                          </tr>
                      )) : (
                          <tr><td colSpan={4} className="px-4 py-2 text-center text-gray-500">No data yet.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      <div className="pb-8">
        <div className="text-center mb-8">
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-wider">
            POD POWER
            </h2>
            <p className="text-gray-400 mt-2 text-lg">AI Assistant for Variations & Professional Mockups</p>
        </div>

        <PodFeatureSelector
          selectedFeature={selectedFeature}
          onSelectFeature={handleSelectFeature}
        />
        
        <div className="mt-8">
          {selectedFeature === 'variation' && <PodVariationGenerator onApiError={handleApiError} />}
          {selectedFeature === 'mockup' && <PodMockupRemaker onApiError={handleApiError} />}
        </div>
      </div>
    </div>
  );
};

export default PodPower;