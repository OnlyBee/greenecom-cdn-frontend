
import React from 'react';
import type { Feature } from '../podTypes';

interface FeatureSelectorProps {
  selectedFeature: Feature;
  onSelectFeature: (feature: Feature) => void;
}

export const PodFeatureSelector: React.FC<FeatureSelectorProps> = ({ selectedFeature, onSelectFeature }) => {
  const baseClasses = "px-6 py-3 text-lg font-semibold rounded-lg transition-all duration-300 focus:outline-none";
  const activeClasses = "bg-purple-600 text-white shadow-lg";
  const inactiveClasses = "bg-gray-700 text-gray-300 hover:bg-gray-600";

  return (
    <div className="flex justify-center items-center gap-4 bg-gray-800 p-2 rounded-xl max-w-lg mx-auto border border-gray-700">
      <button
        onClick={() => onSelectFeature('variation')}
        className={`${baseClasses} ${selectedFeature === 'variation' ? activeClasses : inactiveClasses}`}
      >
        Tạo variation image
      </button>
      <button
        onClick={() => onSelectFeature('mockup')}
        className={`${baseClasses} ${selectedFeature === 'mockup' ? activeClasses : inactiveClasses}`}
      >
        Remake mockup
      </button>
    </div>
  );
};
