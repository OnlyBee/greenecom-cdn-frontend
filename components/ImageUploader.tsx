import React, { useState, useCallback, useEffect } from 'react';

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);


interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  previewUrl: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, previewUrl }) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        // Find the first image item in the clipboard
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            onFileSelect(file);
            event.preventDefault(); // Prevent the image from being pasted elsewhere
            break; // Stop after handling the first image
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const uploaderContent = previewUrl ? (
     <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded-lg" />
  ) : (
    <div className="flex flex-col items-center justify-center text-center px-4">
        <UploadIcon />
        <p className="mt-2 text-lg font-semibold">Drag & drop or paste image here</p>
        <p className="text-sm text-gray-400">or <span className="font-semibold text-brand-primary">click to browse</span></p>
    </div>
  );
  
  return (
    <div className="w-full max-w-xl mx-auto">
      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative flex items-center justify-center w-full h-80 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer ${isDragging ? 'border-brand-primary bg-base-300' : 'border-base-300 bg-base-200 hover:border-brand-secondary'}`}
      >
        {uploaderContent}
        <input 
          type="file" 
          onChange={handleFileChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          accept="image/png, image/jpeg, image/webp"
        />
      </label>
    </div>
  );
};