
import React, { useState } from 'react';
import type { GeneratedImage } from '../podTypes';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImageGridProps {
  images: GeneratedImage[];
}

export const PodImageGrid: React.FC<ImageGridProps> = ({ images }) => {
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  if (!images.length) return null;

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    images.forEach((img, i) => {
        const base64Data = img.src.split(',')[1];
        zip.file(img.name || `image-${i}.png`, base64Data, { base64: true });
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'mockups.zip');
  };

  return (
    <div className="mt-12 border-t border-gray-700 pt-8">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Generated Images</h2>
          <button 
            onClick={handleDownloadAll}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2"
          >
            <span>⬇ Download All (.zip)</span>
          </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {images.map((image, index) => (
          <div key={index} className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-600 flex flex-col">
            {/* Image Container */}
            <div className="relative aspect-square bg-gray-900 cursor-pointer" onClick={() => setPreviewImg(image.src)}>
                <img src={image.src} alt={image.name} className="w-full h-full object-contain" />
                {/* Preview Icon - Always Visible */}
                <div className="absolute top-2 right-2 bg-black/60 p-2 rounded-full text-white hover:bg-black/80 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </div>
            </div>
            
            {/* Action Bar - Always Visible */}
            <div className="p-4 bg-gray-800 flex justify-between items-center border-t border-gray-700">
                <span className="text-xs text-gray-400 truncate w-1/2" title={image.name}>{image.name}</span>
                <a 
                    href={image.src} 
                    download={image.name} 
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-1.5 rounded-md font-semibold transition"
                >
                    Download
                </a>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewImg && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
              <img src={previewImg} className="max-w-full max-h-full rounded-lg shadow-2xl" />
              <button className="absolute top-5 right-5 text-white text-4xl">&times;</button>
          </div>
      )}
    </div>
  );
};
