
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

  if (!images.length) return null;

  const handleDownloadAll = async () => {
    setIsZipping(true);
    const zip = new JSZip();
    
    try {
        await Promise.all(images.map(async (img) => {
            // Fetch blob from base64 string
            const res = await fetch(img.src);
            const blob = await res.blob();
            zip.file(img.name, blob);
        }));

        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "generated_images.zip");
    } catch (e) {
        console.error("Zip error:", e);
        alert("Failed to zip images.");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="mt-12">
      <div className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h2 className="text-xl font-bold text-white">Generated Images ({images.length})</h2>
          <button 
            onClick={handleDownloadAll} 
            disabled={isZipping}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg"
          >
            <DownloadIcon />
            {isZipping ? 'Creating Zip...' : 'Download All'}
          </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {images.map((image, index) => (
          <div key={index} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg border border-gray-700 aspect-square group relative">
            <img 
                src={image.src} 
                alt={image.name} 
                className="w-full h-full object-contain cursor-pointer bg-gray-900" 
                onClick={() => setPreviewImage(image)}
            />
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4">
                <div className="flex justify-end">
                    <button 
                        onClick={() => setPreviewImage(image)}
                        className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                        title="Preview"
                    >
                        <EyeIcon />
                    </button>
                </div>
                <div className="flex justify-center">
                     <a 
                        href={image.src} 
                        download={image.name} 
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DownloadIcon /> Download
                    </a>
                </div>
                <div></div>
            </div>
          </div>
        ))}
      </div>

      {/* PREVIEW MODAL */}
      {previewImage && (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
            onClick={() => setPreviewImage(null)}
        >
            <button 
                onClick={() => setPreviewImage(null)} 
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
                <CloseIcon />
            </button>
            <img 
                src={previewImage.src} 
                alt={previewImage.name} 
                className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl border border-gray-800" 
                onClick={e => e.stopPropagation()} 
            />
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900/90 px-6 py-2 rounded-full text-white border border-gray-700 font-medium">
                {previewImage.name}
            </div>
        </div>
      )}
    </div>
  );
};
