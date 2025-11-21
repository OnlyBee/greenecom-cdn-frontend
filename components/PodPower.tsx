
import React, { useState, useEffect, useCallback } from 'react';
import { PodFeatureSelector } from './PodFeatureSelector';
import { PodVariationGenerator } from './PodVariationGenerator';
import { PodMockupRemaker } from './PodMockupRemaker';
import { PodApiKeyModal } from './PodApiKeyModal';
import { getApiKey, setApiKey as saveApiKey, clearApiKey } from '../utils/apiKey';
import type { Feature } from '../podTypes';

const PodPower: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<Feature>('variation');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);

  useEffect(() => {
    const existingKey = getApiKey();
    if (existingKey) {
      setApiKeyState(existingKey);
    } else {
      setIsApiKeyModalOpen(true);
    }
  }, []);

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
      
      {/* Nếu chưa có key thì hiển thị modal đè lên trên */}
      {(!apiKey || isApiKeyModalOpen) && (
          <PodApiKeyModal
            isOpen={true}
            onClose={() => { 
                // Chỉ cho phép đóng nếu đã có key (để xem giao diện mà không dùng tính năng)
                // Nhưng ở đây ta force user nhập
                if (apiKey) setIsApiKeyModalOpen(false);
            }}
            onSave={handleSaveApiKey}
          />
      )}

      <div className="pb-8">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white tracking-wider">
            POD <span className="text-purple-500">Power</span>
            </h2>
            <p className="text-gray-400 mt-1">Your AI Assistant for Print-On-Demand Success</p>
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
