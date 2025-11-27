import React from 'react';
import type { Feature } from '../podTypes';

interface FeatureSelectorProps {
  selectedFeature: Feature;
  onSelectFeature: (feature: Feature) => void;
}

export const PodFeatureSelector: React.FC<FeatureSelectorProps> = ({ selectedFeature, onSelectFeature }) => {
  return (
    <div className="flex justify-center items-center gap-4 bg-gray-800 p-2 rounded-xl max-w-lg mx-auto border border-gray-700">
      <button
        onClick={() => onSelectFeature('variation')}
        className={`px-6 py-3 text-lg font-semibold rounded-lg transition-all ${selectedFeature === 'variation' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
      >
        Variation
      </button>
      <button
        onClick={() => onSelectFeature('mockup')}
        className={`px-6 py-3 text-lg font-semibold rounded-lg transition-all ${selectedFeature === 'mockup' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
      >
        Mockup
      </button>
    </div>
  );
};