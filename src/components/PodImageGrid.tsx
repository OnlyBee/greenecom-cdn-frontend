
import React, { useState } from 'react';
import type { GeneratedImage } from '../types';
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
        saveAs(content, "pod_power_results.zip");
    } catch (e) {
        console.error("Zip failed", e);
        alert("Failed to zip images.");
    } finally {
        setIsZipping(false);
    }
  };

  return (
    <div className="mt-12 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Generated Images</h2>
        <button
          onClick={handleDownloadAll}
          disabled={isZipping}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 shadow-lg transition-all"
        >
          <DownloadIcon /> {isZipping ? 'Zipping...' : 'Download All (.zip)'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <div key={index} className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 group relative">
            <img src={image.src} alt={image.name} className="w-full h-auto object-contain" />
            
            <div className="bg-gray-900/90 p-3 flex justify-between items-center backdrop-blur-sm border-t border-gray-600">
                <button 
                    onClick={() => setPreviewImage(image)}
                    className="flex items-center gap-1 text-sm text-blue-300 hover:text-white transition-colors"
                >
                    <EyeIcon /> Preview
                </button>
                <a
                    href={image.src}
                    download={image.name}
                    className="flex items-center gap-1 text-sm bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded transition-colors"
                >
                    <DownloadIcon /> Save
                </a>
            </div>
          </div>
        ))}
      </div>

      {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" onClick={() => setPreviewImage(null)}>
              <div className="relative max-w-full max-h-full">
                  <img src={previewImage.src} alt="Preview" className="max-h-[90vh] max-w-[90vw] rounded shadow-2xl" />
                  <button onClick={() => setPreviewImage(null)} className="absolute -top-10 right-0 text-white text-4xl">&times;</button>
              </div>
          </div>
      )}
    </div>
  );
};
