
import React from 'react';
import type { Feature } from '../types';

interface FeatureSelectorProps {
  selectedFeature: Feature;
  onSelectFeature: (feature: Feature) => void;
}

export const FeatureSelector: React.FC<FeatureSelectorProps> = ({ selectedFeature, onSelectFeature }) => {
  const baseClasses = "px-6 py-3 text-lg font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-100";
  const activeClasses = "bg-brand-primary text-white shadow-lg";
  const inactiveClasses = "bg-base-200 text-base-content hover:bg-base-300";

  return (
    <div className="flex justify-center items-center gap-4 bg-base-200 p-2 rounded-xl max-w-lg mx-auto">
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
