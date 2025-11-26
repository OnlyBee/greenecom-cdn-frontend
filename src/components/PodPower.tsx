
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
  const { user } = useAuth();

  useEffect(() => {
    const existingKey = getApiKey();
    if (existingKey) {
      setApiKeyState(existingKey);
    } else {
      setIsApiKeyModalOpen(true);
    }
    
    // Fetch stats if admin
    if (user?.role === 'ADMIN') {
        api.getStats().then(setStats).catch(err => console.log("Stats fetch ignored"));
    }
  }, [user]);

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

      {/* STATS SECTION (ADMIN ONLY) */}
      {user?.role === 'ADMIN' && stats.length > 0 && (
          <div className="mt-16 border-t border-gray-700 pt-8">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">System Usage Statistics</h3>
              <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden max-w-4xl mx-auto">
                  <table className="w-full text-left">
                      <thead className="bg-gray-700 text-gray-300 uppercase text-sm">
                          <tr>
                              <th className="px-6 py-4">User</th>
                              <th className="px-6 py-4">Variation Calls</th>
                              <th className="px-6 py-4">Mockup Calls</th>
                              <th className="px-6 py-4 text-right">Total Usage</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                          {stats.map((stat, idx) => (
                              <tr key={idx} className="hover:bg-gray-700/50 transition-colors">
                                  <td className="px-6 py-4 font-medium text-white">{stat.username}</td>
                                  <td className="px-6 py-4 text-green-400 font-mono">{stat.variation_count || 0}</td>
                                  <td className="px-6 py-4 text-purple-400 font-mono">{stat.mockup_count || 0}</td>
                                  <td className="px-6 py-4 text-right font-bold text-white text-lg">{stat.total_count}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default PodPower;
