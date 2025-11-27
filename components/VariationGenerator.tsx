
import React, { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { ImageGrid } from './ImageGrid';
import { Spinner } from './Spinner';
import { generateVariations } from '../services/geminiService';
import { VARIATION_COLORS } from '../constants';
import type { GeneratedImage, Color } from '../types';

interface VariationGeneratorProps {
  onApiError: () => void;
}

export const VariationGenerator: React.FC<VariationGeneratorProps> = ({ onApiError }) => {
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
    if (!selectedFile) {
      setError("Vui lòng chọn một ảnh trước.");
      return;
    }
    if (selectedColors.length === 0) {
      setError("Vui lòng chọn ít nhất một màu để tạo.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const images = await generateVariations(selectedFile, selectedColors);
      setGeneratedImages(images);
    } catch (err: any) {
      console.error(err);
      let friendlyErrorMessage = "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
      const rawErrorMessage = err.message || err.toString();
      let triggerApiErrorFlow = false;

      if (rawErrorMessage.includes("API key not found") || rawErrorMessage.toLowerCase().includes("api key") || rawErrorMessage.includes("400") || rawErrorMessage.includes("403")) {
        friendlyErrorMessage = "API Key không hợp lệ hoặc đã bị thu hồi. Vui lòng nhập một key mới.";
        triggerApiErrorFlow = true;
      } else if (rawErrorMessage.includes("quota") || rawErrorMessage.includes("429")) {
        friendlyErrorMessage = "Bạn đã vượt quá hạn mức sử dụng cho API Key này. Vui lòng nhập một key mới hoặc kiểm tra thông tin thanh toán.";
        triggerApiErrorFlow = true;
      } else {
        friendlyErrorMessage = `Đã xảy ra lỗi khi tạo ảnh. Chi tiết: ${rawErrorMessage}`;
      }

      setError(friendlyErrorMessage);
      if (triggerApiErrorFlow) {
        onApiError();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateButtonText = () => {
    if (isLoading) return <Spinner />;
    if (selectedColors.length > 0) {
      return `Generate ${selectedColors.length} Variation${selectedColors.length > 1 ? 's' : ''}`;
    }
    return 'Generate Variations';
  };

  return (
    <div className="bg-base-200/50 p-6 sm:p-8 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold text-center text-white mb-2">Create Color Variations</h2>
      <p className="text-center text-base-content mb-6">Upload your design, select your colors, and let AI do the rest.</p>
      
      <ImageUploader onFileSelect={handleFileSelect} previewUrl={previewUrl} />
      
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
                      ? 'bg-brand-primary border-brand-primary text-white ring-2 ring-offset-2 ring-offset-base-200 ring-brand-primary' 
                      : `bg-base-300 border-transparent hover:border-brand-secondary text-base-content`
                  }`}
                  aria-pressed={isSelected}
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
          className="bg-brand-primary hover:bg-brand-secondary disabled:bg-base-300 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg text-lg transition-all duration-300 shadow-lg flex items-center justify-center mx-auto min-w-[250px]"
        >
          {generateButtonText()}
        </button>
      </div>

      {error && <p className="mt-4 text-center text-red-400">{error}</p>}

      <ImageGrid images={generatedImages} />
    </div>
  );
};
