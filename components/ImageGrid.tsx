import React, { useState } from 'react';
import type { ImageFile } from '../types';

interface ImageGridProps {
  images: ImageFile[];
  onDelete: (imageId: string) => void;
}

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ImageCard: React.FC<{ image: ImageFile; onDelete: (imageId: string) => void; }> = ({ image, onDelete }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(image.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${image.name}"? This action cannot be undone.`)) {
            onDelete(image.id);
        }
    };

    return (
        <div className="group bg-gray-700 rounded-lg overflow-hidden shadow-lg transition-transform transform hover:scale-105 relative">
            <img src={image.displayUrl} alt={image.name} className="w-full h-48 object-cover"/>
            <button 
                onClick={handleDelete}
                aria-label={`Delete image ${image.name}`}
                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-700 focus:ring-red-500"
            >
                <TrashIcon />
            </button>
            <div className="p-4">
                <p className="text-sm text-gray-300 truncate mb-2" title={image.name}>{image.name}</p>
                <div className="flex items-center bg-gray-800 rounded-md p-2">
                    <input type="text" readOnly value={image.url} className="bg-transparent text-xs text-gray-400 w-full focus:outline-none"/>
                    <button onClick={handleCopy} className={`ml-2 p-1 rounded-md transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-green-600'}`}>
                        {copied ? <CheckIcon /> : <CopyIcon />}
                    </button>
                </div>
            </div>
        </div>
    );
}

const ImageGrid: React.FC<ImageGridProps> = ({ images, onDelete }) => {
  if (images.length === 0) {
    return <p className="text-gray-400 text-center py-8">No images in this folder yet. Upload one!</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {images.map((image) => (
        <ImageCard key={image.id} image={image} onDelete={onDelete} />
      ))}
    </div>
  );
};

export default ImageGrid;