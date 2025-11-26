
import React, { useState } from 'react';
import type { GeneratedImage } from '../podTypes';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImageGridProps {
  images: GeneratedImage[];
}

export const PodImageGrid: React.FC<ImageGridProps> = ({ images }) => {
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  if (!images.length) return null;

  const handleDownloadAll = async () => {
    setIsZipping(true);
    const zip = new JSZip();
    
    await Promise.all(images.map(async (img) => {
        // Handle base64 data URI
        const response = await fetch(img.src);
        const blob = await response.blob();
        zip.file(img.name, blob);
    }));

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "generated_images.zip");
    setIsZipping(false);
  };

  return (
    <div className="mt-12">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Generated Images</h2>
          <button 
            onClick={handleDownloadAll} 
            disabled={isZipping}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
          >
            {isZipping ? 'Zipping...' : 'Download All (.zip)'}
          </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {images.map((image, index) => (
          <div key={index} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 aspect-square group relative">
            <img 
                src={image.src} 
                alt={image.name} 
                className="w-full h-full object-contain cursor-pointer" 
                onClick={() => setPreviewImage(image)}
            />
            <div className="absolute inset-0 bg-black/50 flex flex-col gap-2 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="text-white text-sm font-medium pointer-events-auto cursor-pointer" onClick={() => setPreviewImage(image)}>Click to Preview</span>
                <a href={image.src} download={image.name} className="bg-purple-600 text-white px-4 py-2 rounded-full font-bold pointer-events-auto">Download</a>
            </div>
          </div>
        ))}
      </div>

      {/* PREVIEW MODAL */}
      {previewImage && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setPreviewImage(null)}
        >
            <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img src={previewImage.src} alt={previewImage.name} className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};