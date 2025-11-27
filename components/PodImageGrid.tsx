import React from 'react';
import type { GeneratedImage } from '../podTypes';

interface ImageGridProps {
  images: GeneratedImage[];
}

export const PodImageGrid: React.FC<ImageGridProps> = ({ images }) => {
  if (!images.length) return null;

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-white text-center mb-6">Generated Images</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {images.map((image, index) => (
          <div key={index} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 aspect-square group relative">
            <img src={image.src} alt={image.name} className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={image.src} download={image.name} className="bg-purple-600 text-white px-4 py-2 rounded-full font-bold">Download</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};