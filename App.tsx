
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { FeatureSelector } from './components/FeatureSelector';
import { VariationGenerator } from './components/VariationGenerator';
import { MockupRemaker } from './components/MockupRemaker';
import { ApiKeyModal } from './components/ApiKeyModal';
import { getApiKey, setApiKey, clearApiKey } from './utils/apiKey';
import type { Feature } from './types';

const App: React.FC = () => {
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
    setApiKey(key);
    setApiKeyState(key);
    setIsApiKeyModalOpen(false);
  };

  const handleApiError = useCallback(() => {
    clearApiKey();
    setApiKeyState(null);
    setIsApiKeyModalOpen(true);
  }, []);

  // Nếu chưa có key, chỉ hiển thị modal trên nền trống
  if (!apiKey) {
    return (
      <div className="min-h-screen bg-base-100">
        <ApiKeyModal
          isOpen={isApiKeyModalOpen}
          onClose={() => { /* Không cho phép đóng modal nếu chưa có key */ }}
          onSave={handleSaveApiKey}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 font-sans">
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSave={handleSaveApiKey}
      />
      <Header />
      <main className="container mx-auto px-4 py-8">
        <FeatureSelector
          selectedFeature={selectedFeature}
          onSelectFeature={setSelectedFeature}
        />
        <div className="mt-8">
          {selectedFeature === 'variation' && <VariationGenerator onApiError={handleApiError} />}
          {selectedFeature === 'mockup' && <MockupRemaker onApiError={handleApiError} />}
        </div>
      </main>
    </div>
  );
};

export default App;
