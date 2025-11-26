import React, { useState } from 'react';
import type { GeneratedImage } from '../podTypes';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImageGridProps {
  images: GeneratedImage[];
}

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
);

const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
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
        saveAs(content, "pod_results.zip");
    } catch (e) {
        alert("Failed to zip files.");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="mt-12 pt-8 w-full border-t border-gray-700">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-white">Results ({images.length})</h2>
          <button 
            onClick={handleDownloadAll} 
            disabled={isZipping}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all"
          >
            <DownloadIcon />
            {isZipping ? 'Compressing...' : 'Download All (.ZIP)'}
          </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {images.map((image, index) => (
          <div key={index} className="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700 flex flex-col">
            {/* Image Area */}
            <div 
                className="relative aspect-square cursor-pointer group"
                onClick={() => setPreviewImage(image)}
            >
                <img src={image.src} alt={image.name} className="w-full h-full object-cover" />
                {/* Overlay with Eye Icon */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <EyeIcon />
                </div>
            </div>

            {/* Action Bar (Always Visible) */}
            <div className="p-3 bg-gray-900 flex gap-2">
                <button 
                    onClick={() => setPreviewImage(image)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded text-sm font-medium flex justify-center items-center gap-1"
                    title="Preview"
                >
                    <EyeIcon /> View
                </button>
                <a 
                    href={image.src} 
                    download={image.name} 
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm font-medium flex justify-center items-center gap-1"
                    title="Download"
                >
                    <DownloadIcon /> Save
                </a>
            </div>
          </div>
        ))}
      </div>

      {/* Full Screen Preview Modal */}
      {previewImage && (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
            onClick={() => setPreviewImage(null)}
        >
            <button 
                onClick={() => setPreviewImage(null)} 
                className="absolute top-6 right-6 text-gray-400 hover:text-white bg-gray-800 p-3 rounded-full border border-gray-600 z-50"
            >
                <CloseIcon />
            </button>
            <img 
                src={previewImage.src} 
                alt={previewImage.name} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-gray-800" 
                onClick={e => e.stopPropagation()}
            />
        </div>
      )}
    </div>
  );
};