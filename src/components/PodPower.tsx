import React, { useState, useEffect, useCallback } from 'react';
import { PodFeatureSelector } from './PodFeatureSelector';
import { PodVariationGenerator } from './PodVariationGenerator';
import { PodMockupRemaker } from './PodMockupRemaker';
import { PodApiKeyModal } from './PodApiKeyModal';
import { getApiKey, setApiKey as saveApiKey, clearApiKey } from '../utils/apiKey';
import type { Feature } from '../podTypes';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

const PodPower: React.FC = () => {
  const { user } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState<Feature>('variation');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    const existingKey = getApiKey();
    if (existingKey) {
      setApiKeyState(existingKey);
    } else {
      setIsApiKeyModalOpen(true);
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
      try {
          const data = await api.getStats();
          setStats(data || []);
      } catch(e) { console.error(e); }
  };

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
    <div className="min-h-screen text-gray-100 font-sans relative">
      {(!apiKey || isApiKeyModalOpen) && (
          <PodApiKeyModal
            isOpen={true}
            onClose={() => { if (apiKey) setIsApiKeyModalOpen(false); }}
            onSave={handleSaveApiKey}
            isAdmin={user?.role === 'ADMIN'}
          />
      )}

      <div className="pb-8">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white tracking-wider">
            POD <span className="text-purple-500">Power</span>
            </h2>
            <p className="text-gray-400 mt-1">AI Assistant for Print-On-Demand</p>
        </div>

        {/* STATS TABLE - VISIBLE TO ALL FOR NOW */}
        <div className="mb-8 bg-gray-800 p-4 rounded-lg border border-gray-700 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-white">📊 Usage Statistics</h3>
                <button onClick={fetchStats} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Refresh</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                        <tr>
                            <th className="px-4 py-2">User</th>
                            <th className="px-4 py-2">Variation</th>
                            <th className="px-4 py-2">Mockup</th>
                            <th className="px-4 py-2">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((s, i) => (
                            <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-2 font-medium text-white">{s.username}</td>
                                <td className="px-4 py-2">{s.variation_count || 0}</td>
                                <td className="px-4 py-2">{s.mockup_count || 0}</td>
                                <td className="px-4 py-2 text-green-400 font-bold">{s.total_count}</td>
                            </tr>
                        ))}
                        {stats.length === 0 && <tr><td colSpan={4} className="text-center py-2">No data yet</td></tr>}
                    </tbody>
                </table>
            </div>
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
    </div>
  );
};

export default PodPower;