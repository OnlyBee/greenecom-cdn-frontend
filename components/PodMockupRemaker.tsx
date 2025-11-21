import React, { useState } from 'react';
import { PodImageUploader } from './PodImageUploader';
import { PodImageGrid } from './PodImageGrid';
import { PodSpinner } from './PodSpinner';
import { remakeMockups } from '../services/geminiService';
import type { GeneratedImage, ApparelType } from '../podTypes';

const APPAREL_TYPES: ApparelType[] = ['T-shirt', 'Hoodie', 'Sweater'];

interface MockupRemakerProps {
  onApiError: () => void;
}

export const PodMockupRemaker: React.FC<MockupRemakerProps> = ({ onApiError }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedApparelTypes, setSelectedApparelTypes] = useState<ApparelType[]>([]);
  
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setGeneratedImages([]);
    setError(null);
    setSelectedApparelTypes([]);
  };

  const handleApparelSelect = (type: ApparelType) => {
    setSelectedApparelTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!selectedFile) return setError("Vui lòng chọn một ảnh trước.");
    
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const images = await remakeMockups(selectedFile, selectedApparelTypes);
      setGeneratedImages(images);
    } catch (err: any) {
      console.error(err);
      const rawMsg = err.message || err.toString();
      if (rawMsg.includes("API key") || rawMsg.includes("400") || rawMsg.includes("403")) {
         onApiError();
         setError("API Key lỗi.");
      } else {
         setError(`Lỗi: ${rawMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-700">
      <h2 className="text-2xl font-bold text-center text-white mb-2">Remake Professional Mockups</h2>
      <PodImageUploader onFileSelect={handleFileSelect} previewUrl={previewUrl} />

      {selectedFile && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-center text-white mb-2">Choose Apparel Type(s)</h3>
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
                      : `bg-gray-700 border-transparent hover:border-purple-400 text-gray-300`
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      <div className="mt-8 text-center">
        <button
          onClick={handleGenerate}
          disabled={!selectedFile || isLoading}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg flex items-center justify-center mx-auto min-w-[250px]"
        >
          {isLoading ? <PodSpinner /> : 'Generate'}
        </button>
      </div>
      {error && <p className="mt-4 text-center text-red-400 bg-red-900/20 p-2 rounded">{error}</p>}
      <PodImageGrid images={generatedImages} />
    </div>
  );
};
