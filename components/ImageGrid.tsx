import React, { useState } from 'react';
import type { ImageFile } from '../types';

interface ImageGridProps {
  images: ImageFile[];
  onDelete: (imageId: string) => void;
  onRename: (imageId: string, newName: string) => void;
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

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const CancelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ImageCard: React.FC<{ image: ImageFile; onDelete: (imageId: string) => void; onRename: (imageId: string, newName: string) => void; }> = ({ image, onDelete, onRename }) => {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(image.name);

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

    const handleStartEdit = () => {
        setEditName(image.name);
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        if (editName.trim() !== '' && editName !== image.name) {
            onRename(image.id, editName);
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditName(image.name);
        setIsEditing(false);
    };

    return (
        <div className="group bg-gray-700 rounded-lg overflow-hidden shadow-lg transition-transform transform hover:scale-105 relative">
            <img src={image.displayUrl} alt={image.name} className="w-full h-48 object-cover"/>
            
            {/* Actions Overlay (Top Right) */}
            <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                {!isEditing && (
                    <>
                        <button 
                            onClick={handleStartEdit}
                            aria-label={`Rename image ${image.name}`}
                            title="Rename"
                            className="p-1.5 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <PencilIcon />
                        </button>
                        <button 
                            onClick={handleDelete}
                            aria-label={`Delete image ${image.name}`}
                            title="Delete"
                            className="p-1.5 bg-red-600 text-white rounded-full shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <TrashIcon />
                        </button>
                    </>
                )}
            </div>

            <div className="p-4">
                {isEditing ? (
                    <div className="flex items-center space-x-2 mb-2">
                        <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-gray-600 text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                            autoFocus
                        />
                        <button onClick={handleSaveEdit} className="text-green-400 hover:text-green-300"><SaveIcon/></button>
                        <button onClick={handleCancelEdit} className="text-red-400 hover:text-red-300"><CancelIcon/></button>
                    </div>
                ) : (
                    <p className="text-sm text-gray-300 truncate mb-2" title={image.name}>{image.name}</p>
                )}
                
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

const ImageGrid: React.FC<ImageGridProps> = ({ images, onDelete, onRename }) => {
  if (images.length === 0) {
    return <p className="text-gray-400 text-center py-8">No images in this folder yet. Upload one!</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {images.map((image) => (
        <ImageCard 
            key={image.id} 
            image={image} 
            onDelete={onDelete} 
            onRename={onRename}
        />
      ))}
    </div>
  );
};

export default ImageGrid;
