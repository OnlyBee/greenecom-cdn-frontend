import React, { useState, useCallback } from 'react';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  previewUrl: string | null;
}

export const PodImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, previewUrl }) => {
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <div className="w-full max-w-xl mx-auto">
      <label onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className={`relative flex items-center justify-center w-full h-80 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${isDragging ? 'border-purple-500 bg-gray-700' : 'border-gray-600 bg-gray-800 hover:border-purple-400'}`}>
        {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
        ) : (
            <div className="text-center p-4">
                <p className="text-lg font-semibold text-gray-300">Drag & drop or click</p>
            </div>
        )}
        <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
      </label>
    </div>
  );
};