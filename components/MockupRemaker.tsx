
import React, { useState } from 'react';
import { ImageUploader } from './ImageUploader';
import { ImageGrid } from './ImageGrid';
import { Spinner } from './Spinner';
import { remakeMockups } from '../services/geminiService';
import type { GeneratedImage, ApparelType } from '../types';

const APPAREL_TYPES: ApparelType[] = ['T-shirt', 'Hoodie', 'Sweater'];

interface MockupRemakerProps {
  onApiError: () => void;
}

export const MockupRemaker: React.FC<MockupRemakerProps> = ({ onApiError }) => {
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
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      setError("Vui lòng chọn một ảnh trước.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const images = await remakeMockups(selectedFile, selectedApparelTypes);
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
        friendlyErrorMessage = `Đã xảy ra lỗi khi tạo mockup. Chi tiết: ${rawErrorMessage}`;
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
    const numTypes = selectedApparelTypes.length;
    if (numTypes > 0) {
      const totalMockups = numTypes * 2;
      return `Generate ${totalMockups} Mockup${totalMockups > 1 ? 's' : ''}`;
    }
    return 'Generate 2 Mockups';
  };

  return (
    <div className="bg-base-200/50 p-6 sm:p-8 rounded-2xl shadow-xl">
      <h2 className="text-2xl font-bold text-center text-white mb-2">Remake Professional Mockups</h2>
      <p className="text-center text-base-content mb-6">Generate two new mockups: one with a model and one flat-lay.</p>
      
      <ImageUploader onFileSelect={handleFileSelect} previewUrl={previewUrl} />

      {selectedFile && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-center text-white mb-2">Choose Apparel Type(s) (Optional)</h3>
          <p className="text-center text-base-content mb-4 text-sm">Default is to match the uploaded image type. You can select multiple.</p>
          <div className="flex flex-wrap justify-center gap-4 max-w-lg mx-auto">
            {APPAREL_TYPES.map((type) => {
              const isSelected = selectedApparelTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => handleApparelSelect(type)}
                  className={`px-5 py-2 rounded-lg text-md font-semibold transition-all duration-200 border-2 ${
                    isSelected 
                      ? 'bg-brand-primary border-brand-primary text-white ring-2 ring-offset-2 ring-offset-base-200 ring-brand-primary' 
                      : `bg-base-300 border-transparent hover:border-brand-secondary text-base-content`
                  }`}
                  aria-pressed={isSelected}
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
