
import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

interface UploadFormProps {
  folderId: string;
  folderName: string;
  onUploadSuccess: () => void;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const UploadForm: React.FC<UploadFormProps> = ({ folderId, folderName, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate preview when file/url changes
  useEffect(() => {
    if (file) {
        const objUrl = URL.createObjectURL(file);
        setPreviewUrl(objUrl);
        return () => URL.revokeObjectURL(objUrl);
    } else if (urlInput.trim()) {
        setPreviewUrl(urlInput.trim());
    } else {
        setPreviewUrl(null);
    }
  }, [file, urlInput]);

  // Handle Paste (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    
    // 1. Check for File (Image)
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                setFile(blob);
                setUrlInput('');
                setError(null);
                return;
            }
        }
    }

    // 2. Check for Text (URL)
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.match(/^https?:\/\/.+/)) {
        setFile(null);
        setUrlInput(pastedText);
        setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUrlInput('');
      setError(null);
    }
  };

  const handleClear = () => {
      setFile(null);
      setUrlInput('');
      setPreviewUrl(null);
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!file && !urlInput) {
        setError('Please select a file or enter a URL.');
        return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
        if (file) {
            await api.uploadImage(file, folderId, folderName);
        } else if (urlInput) {
            await api.uploadImageUrl(urlInput, folderId);
        }
        setSuccess('Image uploaded successfully!');
        handleClear();
        onUploadSuccess();
    } catch (err: any) {
        setError(err.message || 'Upload failed. Please try again.');
    } finally {
        setLoading(false);
        setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Check if pasting is currently happening in a text input to avoid double handling
  const isFocusedOnInput = (e: any) => {
      return e.target.tagName === 'INPUT' && e.target.type === 'text';
  };

  return (
    <div 
        ref={containerRef}
        onPaste={(e) => {
            // Only handle paste on the container if not focused on the URL input
            if (!isFocusedOnInput(e)) handlePaste(e);
        }}
        className="bg-gray-700/50 p-6 rounded-lg border-2 border-dashed border-gray-600 hover:border-gray-500 transition-colors relative outline-none"
        tabIndex={0} // Make div focusable to capture paste
    >
      <div className="flex flex-col items-center space-y-4">
        
        {/* HEADER */}
        {!previewUrl && (
            <div className="text-center space-y-2">
                <p className="text-gray-300 font-medium">
                    Drag & Drop, Paste (Ctrl+V), or Select an Image
                </p>
                <div className="flex items-center justify-center space-x-4">
                    <label className="cursor-pointer bg-gray-600 hover:bg-gray-500 text-white text-sm px-4 py-2 rounded-md transition">
                        Choose File
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                    </label>
                    <span className="text-gray-400 text-sm">- or -</span>
                    <input 
                        type="text"
                        placeholder="Paste image URL here..."
                        className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white w-64 focus:ring-2 focus:ring-green-500 outline-none"
                        value={urlInput}
                        onChange={(e) => {
                            setUrlInput(e.target.value);
                            if(e.target.value) setFile(null);
                        }}
                    />
                </div>
            </div>
        )}

        {/* PREVIEW AREA */}
        {previewUrl && (
            <div className="relative w-full max-w-md bg-gray-800 rounded-lg p-2 border border-gray-600">
                <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full h-64 object-contain rounded-md bg-black/20"
                    onError={() => setError('Invalid Image URL')}
                />
                <button 
                    onClick={handleClear}
                    className="absolute top-[-10px] right-[-10px] bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-lg"
                >
                    <XIcon />
                </button>
                <div className="mt-2 text-center">
                    <p className="text-xs text-gray-400 truncate px-2">
                        {file ? `File: ${file.name}` : 'External Link'}
                    </p>
                </div>
            </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="w-full flex justify-center pt-2">
             <button 
                onClick={handleSubmit} 
                disabled={loading || !previewUrl} 
                className={`
                    flex items-center px-6 py-2 rounded-md font-semibold text-white transition-all
                    ${loading || !previewUrl ? 'bg-gray-600 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-green-500/30'}
                `}
            >
                {loading ? (
                    <span>Uploading...</span>
                ) : (
                    <>
                        {file ? <UploadIcon /> : <LinkIcon />}
                        {file ? 'Upload File' : 'Save URL'}
                    </>
                )}
            </button>
        </div>

        {/* MESSAGES */}
        {error && <p className="text-red-400 text-sm bg-red-900/20 px-3 py-1 rounded">{error}</p>}
        {success && <p className="text-green-400 text-sm bg-green-900/20 px-3 py-1 rounded">{success}</p>}
      </div>
    </div>
  );
};

export default UploadForm;
