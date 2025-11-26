
import React, { useState } from 'react';
import type { GeneratedImage } from '../podTypes';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImageGridProps {
  images: GeneratedImage[];
}

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const PodImageGrid: React.FC<ImageGridProps> = ({ images }) => {
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  if (!images || images.length === 0) return null;

  const handleDownloadAll = async () => {
    setIsZipping(true);
    const zip = new JSZip();
    
    try {
        const promises = images.map(async (img) => {
            const res = await fetch(img.src);
            const blob = await res.blob();
            zip.file(img.name, blob);
        });
        await Promise.all(promises);

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "mockups_collection.zip");
    } catch (e) {
        console.error("Zip error:", e);
        alert("Failed to create zip file.");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="mt-12 pb-12 border-t border-gray-700 pt-8">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Generated Results ({images.length})</h2>
          <button 
            onClick={handleDownloadAll} 
            disabled={isZipping}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
          >
            <DownloadIcon />
            {isZipping ? 'Zipping...' : 'Download All (.zip)'}
          </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
        {images.map((image, index) => (
          <div key={index} className="group relative bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700 aspect-square">
            <img 
                src={image.src} 
                alt={image.name} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer" 
                onClick={() => setPreviewImage(image)}
            />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center gap-4">
                <button 
                    onClick={(e) => { e.stopPropagation(); setPreviewImage(image); }}
                    className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors"
                >
                    <EyeIcon /> Preview
                </button>
                <a 
                    href={image.src} 
                    download={image.name} 
                    onClick={(e) => e.stopPropagation()}
                    className="bg-purple-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-purple-500 transition-colors"
                >
                    <DownloadIcon /> Download
                </a>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-center text-xs text-gray-300 truncate">
                {image.name}
            </div>
          </div>
        ))}
      </div>

      {/* PREVIEW MODAL */}
      {previewImage && (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)}
        >
            <button 
                onClick={() => setPreviewImage(null)} 
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors bg-gray-800 rounded-full p-2"
            >
                <CloseIcon />
            </button>
            <img 
                src={previewImage.src} 
                alt={previewImage.name} 
                className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl border border-gray-800" 
                onClick={e => e.stopPropagation()} 
            />
        </div>
      )}
    </div>
  );
};
