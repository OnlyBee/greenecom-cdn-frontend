
import React, { useState, useCallback } from 'react';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  previewUrl: string | null;
}

export const PodImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, previewUrl }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                const name = `pasted-image-${Date.now()}.png`;
                const file = new File([blob], name, { type: blob.type });
                onFileSelect(file);
                break; // Only take the first image
            }
        }
    }
  }, [onFileSelect]);

  return (
    <div className="w-full max-w-xl mx-auto outline-none" tabIndex={0} onPaste={handlePaste} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}>
      <label 
        onDragEnter={handleDrag} 
        onDragLeave={handleDrag} 
        onDragOver={handleDrag} 
        onDrop={handleDrop} 
        className={`relative flex items-center justify-center w-full h-80 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer 
            ${isDragging || isFocused ? 'border-purple-500 bg-gray-700 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'border-gray-600 bg-gray-800 hover:border-purple-400'}
        `}
      >
        {previewUrl ? (
            <div className="relative w-full h-full p-2">
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                 <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                    <span className="text-white font-medium">Click or Paste to replace</span>
                 </div>
            </div>
        ) : (
            <div className="text-center p-4">
                <p className="text-lg font-semibold text-gray-300">Drag & drop, Click, or Paste (Ctrl+V)</p>
                <p className="text-sm text-gray-500 mt-2">Supports JPG, PNG, WEBP</p>
            </div>
        )}
        <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
      </label>
    </div>
  );
};
