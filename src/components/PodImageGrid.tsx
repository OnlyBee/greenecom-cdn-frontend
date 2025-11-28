import React, { useState, useEffect } from 'react';
import type { GeneratedImage } from '../podTypes';

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const PreviewIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface ImageGridProps {
  images: GeneratedImage[];
}

export const PodImageGrid: React.FC<ImageGridProps> = ({ images }) => {
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setPreviewImage(null);
        }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  if (!images.length) {
    return null;
  }

  const handleDownloadAll = () => {
    images.forEach((image, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = image.src;
        link.download = image.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 250); 
    });
  };

  return (
    <div className="mt-12">
      <div className="flex flex-col sm:flex-row justify-center items-center text-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">Generated Images</h2>
        <button
          onClick={handleDownloadAll}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-all duration-300 shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <DownloadIcon />
          <span>Download All ({images.length})</span>
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {images.map((image, index) => (
          <div key={index} className="group relative rounded-lg overflow-hidden shadow-lg bg-gray-800 aspect-square border border-gray-700">
            <img src={image.src} alt={`Generated mockup: ${image.name}`} className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
              <button
                onClick={() => setPreviewImage(image)}
                title="Preview"
                className="bg-white text-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-100 transform hover:scale-110 transition-transform"
              >
                 <PreviewIcon />
              </button>
              <a
                href={image.src}
                download={image.name}
                title="Download"
                className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-500 transform hover:scale-110 transition-transform"
              >
                <DownloadIcon />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / Preview Modal */}
      {previewImage && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 transition-opacity duration-300 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
              <button 
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-50 bg-black/50 rounded-full p-2"
                onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(null);
                }}
              >
                  <CloseIcon />
              </button>
              <div 
                className="relative max-w-full max-h-full overflow-hidden rounded-lg shadow-2xl flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                  <img 
                    src={previewImage.src} 
                    alt={previewImage.name} 
                    className="max-w-full max-h-[85vh] object-contain" 
                  />
                  <div className="mt-4 text-white text-lg font-medium px-4 py-2 bg-black/60 rounded-full">
                      {previewImage.name}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};