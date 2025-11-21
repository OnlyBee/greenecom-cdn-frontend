import React, { useState } from 'react';
import { PodImageUploader } from './PodImageUploader';
import { PodImageGrid } from './PodImageGrid';
import { PodSpinner } from './PodSpinner';
import { generateVariations } from '../services/geminiService';
import { VARIATION_COLORS } from '../podConstants';
import type { GeneratedImage, Color } from '../podTypes';

interface VariationGeneratorProps {
  onApiError: () => void;
}

export const PodVariationGenerator: React.FC<VariationGeneratorProps> = ({ onApiError }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<Color[]>([]);
  
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setGeneratedImages([]);
    setError(null);
    setSelectedColors([]);
  };

  const handleColorSelect = (color: Color) => {
    setSelectedColors(prev => {
      const isSelected = prev.some(sc => sc.value === color.value);
      if (isSelected) {
        return prev.filter(sc => sc.value !== color.value);
      } else {
        return [...prev, color];
      }
    });
  };

  const handleGenerate = async () => {
    if (!selectedFile) return setError("Vui lòng chọn một ảnh trước.");
    if (selectedColors.length === 0) return setError("Vui lòng chọn ít nhất một màu để tạo.");
    
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const images = await generateVariations(selectedFile, selectedColors);
      setGeneratedImages(images);
    } catch (err: any) {
      console.error(err);
      const rawMsg = err.message || err.toString();
      if (rawMsg.includes("API key") || rawMsg.includes("400") || rawMsg.includes("403")) {
         onApiError();
         setError("API Key lỗi. Vui lòng nhập lại.");
      } else {
         setError(`Lỗi: ${rawMsg}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800/50 p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-700">
      <h2 className="text-2xl font-bold text-center text-white mb-2">Create Color Variations</h2>
      <PodImageUploader onFileSelect={handleFileSelect} previewUrl={previewUrl} />
      
      {selectedFile && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-center text-white mb-4">Chọn các màu áo bạn muốn tạo</h3>
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {VARIATION_COLORS.map((color) => {
              const isSelected = selectedColors.some(sc => sc.value === color.value);
              return (
                <button
                  key={color.value}
                  onClick={() => handleColorSelect(color)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                    isSelected 
                      ? 'bg-purple-600 border-purple-600 text-white ring-2 ring-offset-2 ring-offset-gray-800 ring-purple-600' 
                      : `bg-gray-700 border-transparent hover:border-purple-400 text-gray-300`
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center text-xs" 
                      style={{ backgroundColor: color.hex, color: color.hex === '#FFFFFF' ? '#000000' : 'transparent' }}
                    >
                      {isSelected && color.hex === '#FFFFFF' && '✔'}
                    </span>
                    {color.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <button
          onClick={handleGenerate}
          disabled={!selectedFile || isLoading || selectedColors.length === 0}
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
