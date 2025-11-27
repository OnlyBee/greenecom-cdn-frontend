import React, { useState } from 'react';
import type { GeneratedImage } from '../podTypes';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ImageGridProps {
  images: GeneratedImage[];
}

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
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
        alert("Failed to zip images.");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="mt-12 w-full pb-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Generated Results</h2>
        <button
          onClick={handleDownloadAll}
          disabled={isZipping}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 shadow-lg transition-all"
        >
          <DownloadIcon /> {isZipping ? 'Creating Zip...' : 'Download All (.zip)'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {images.map((image, index) => (
          <div key={index} className="bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-gray-700 flex flex-col">
            <div 
                className="relative cursor-pointer bg-gray-900 aspect-square"
                onClick={() => setPreviewImage(image)}
            >
                <img src={image.src} alt={image.name} className="w-full h-full object-contain" />
            </div>
            
            {/* BUTTONS BAR - ALWAYS VISIBLE */}
            <div className="bg-gray-900 p-4 flex justify-between items-center border-t border-gray-600">
                <button 
                    onClick={() => setPreviewImage(image)}
                    className="flex-1 flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-l-lg border-r border-blue-700 transition-colors"
                >
                    <EyeIcon /> Preview
                </button>
                <a
                    href={image.src}
                    download={image.name}
                    className="flex-1 flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-r-lg transition-colors"
                >
                    <DownloadIcon /> Save
                </a>
            </div>
          </div>
        ))}
      </div>

      {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-md" onClick={() => setPreviewImage(null)}>
              <div className="relative w-full h-full flex items-center justify-center">
                  <img src={previewImage.src} alt="Preview" className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain" />
                  <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-white hover:text-red-500 text-5xl font-bold transition-colors">&times;</button>
              </div>
          </div>
      )}
    </div>
  );
};