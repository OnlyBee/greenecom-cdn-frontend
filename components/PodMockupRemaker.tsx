import React, { useState } from 'react';
import { PodImageUploader } from './PodImageUploader';
import { PodImageGrid } from './PodImageGrid';
import { PodSpinner } from './PodSpinner';
import { remakeMockups } from '../services/geminiService';
import { api } from '../services/api';
import type { GeneratedImage, ApparelType } from '../podTypes';

const APPAREL_TYPES: ApparelType[] = ['T-shirt', 'Hoodie', 'Sweater'];

interface MockupRemakerProps {
  apiKey: string;
  onApiError: () => void;
}

export const PodMockupRemaker: React.FC<MockupRemakerProps> = ({ apiKey, onApiError }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApparelTypes, setSelectedApparelTypes] = useState<ApparelType[]>([]);
  const [isDoubleSided, setIsDoubleSided] = useState(false);
  
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setGeneratedImages([]);
    setError(null);
    setSelectedApparelTypes([]);
  };

  const handleApparelSelect = (type: ApparelType) => {
    setSelectedApparelTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const handleGenerate = async () => {
    if (!selectedFile) return setError("Vui lòng chọn một ảnh trước.");
    
    if (!apiKey) {
        onApiError();
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    // TRACK USAGE IMMEDIATELY (Before waiting for AI)
    api.trackUsage('mockup').catch(e => console.error('Tracking failed', e));

    try {
      // Pass apiKey and isDoubleSided
      const images = await remakeMockups(apiKey, selectedFile, selectedApparelTypes, isDoubleSided);
      setGeneratedImages(images);

    } catch (err: any) {
      console.error(err);
      const rawMsg = err.message || err.toString();
      if (rawMsg.includes("API key") || rawMsg.includes("400") || rawMsg.includes("403")) {
         onApiError();
         setError("API Key Error. Please contact Admin.");
      } else {
         setError(`Lỗi: ${rawMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateButtonText = () => {
    if (isLoading) return <PodSpinner />;
    const numTypes = selectedApparelTypes.length > 0 ? selectedApparelTypes.length : 1;
    const totalMockups = numTypes * 2;
    return `Generate ${totalMockups} Mockups`;
  };

  return (
    <div className="bg-gray-800/50 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-700">
      <h2 className="text-2xl font-bold text-center text-white mb-2">Remake Professional Mockups</h2>
      <PodImageUploader onFileSelect={handleFileSelect} previewUrl={previewUrl} />
      
      {selectedFile && (
        <div className="mt-8 space-y-6">
          {/* Apparel Type Selection */}
          <div>
            <h3 className="text-xl font-semibold text-center text-white mb-2">Choose Apparel Type(s) (Optional)</h3>
            <div className="flex flex-wrap justify-center gap-4 max-w-lg mx-auto">
              {APPAREL_TYPES.map((type) => {
                const isSelected = selectedApparelTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => handleApparelSelect(type)}
                    className={`px-5 py-2 rounded-lg text-md font-semibold transition-all duration-200 border-2 ${
                      isSelected 
                        ? 'bg-purple-600 border-purple-600 text-white' 
                        : 'bg-gray-700 border-transparent hover:border-purple-400 text-gray-300'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Double-sided Toggle */}
          <div className="flex justify-center">
            <label className="flex items-center space-x-3 cursor-pointer group select-none">
              <input 
                type="checkbox" 
                className="w-5 h-5 text-purple-600 bg-gray-700 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                checked={isDoubleSided}
                onChange={(e) => setIsDoubleSided(e.target.checked)}
              />
              <span className="text-base font-medium text-gray-300 group-hover:text-white transition-colors">
                Include Back View (Double-sided mockup)
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <button 
            onClick={handleGenerate} 
            disabled={!selectedFile || isLoading} 
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg flex items-center justify-center mx-auto min-w-[250px]"
        >
          {generateButtonText()}
        </button>
      </div>
      
      {error && <p className="mt-4 text-center text-red-400 bg-red-900/20 p-2 rounded">{error}</p>}
      
      <PodImageGrid images={generatedImages} />
    </div>
  );
};