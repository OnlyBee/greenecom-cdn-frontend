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
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const UploadForm: React.FC<UploadFormProps> = ({ folderId, folderName, onUploadSuccess }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (files.length > 0) {
        const urls = files.map(file => URL.createObjectURL(file));
        setPreviewUrls(urls);
        return () => {
            urls.forEach(url => URL.revokeObjectURL(url));
        };
    } else if (urlInput.trim()) {
        setPreviewUrls([urlInput.trim()]);
    } else {
        setPreviewUrls([]);
    }
  }, [files, urlInput]);

  const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
          setIsDragActive(true);
      } else if (e.type === 'dragleave') {
          setIsDragActive(false);
      }
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
          if (droppedFiles.length > 0) {
              setFiles(prev => [...prev, ...droppedFiles]);
              setUrlInput('');
              setError(null);
          }
      }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (isFocusedOnInput(e)) return;

    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                const name = blob.name || `pasted-image-${Date.now()}.png`;
                const renamedFile = new File([blob], name, { type: blob.type });
                pastedFiles.push(renamedFile);
            }
        }
    }

    if (pastedFiles.length > 0) {
        setFiles(prev => [...prev, ...pastedFiles]);
        setUrlInput('');
        setError(null);
        return;
    }

    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.match(/^https?:\/\/.+/)) {
        setFiles([]);
        setUrlInput(pastedText);
        setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setUrlInput('');
      setError(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
      setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
      setFiles([]);
      setUrlInput('');
      setPreviewUrls([]);
      setError(null);
      setProgress('');
  };

  const handleSubmit = async () => {
    if (files.length === 0 && !urlInput) {
        setError('Please select files or enter a URL.');
        return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress('');

    try {
        if (files.length > 0) {
            let successCount = 0;
            for (let i = 0; i < files.length; i++) {
                setProgress(`Uploading ${i + 1}/${files.length}...`);
                try {
                    await api.uploadImage(files[i], folderId, folderName);
                    successCount++;
                } catch (err) {
                    console.error(`Failed to upload ${files[i].name}`, err);
                }
            }
            
            if (successCount === files.length) {
                setSuccess(`All ${files.length} images uploaded successfully!`);
            } else {
                setSuccess(`Uploaded ${successCount}/${files.length} images. Some failed.`);
            }

        } else if (urlInput) {
            setProgress('Saving URL...');
            await api.uploadImageUrl(urlInput, folderId);
            setSuccess('Image saved successfully!');
        }

        handleClear();
        onUploadSuccess();
    } catch (err: any) {
        setError(err.message || 'Upload failed. Please try again.');
    } finally {
        setLoading(false);
        setProgress('');
        setTimeout(() => setSuccess(null), 3000);
    }
  };

  const isFocusedOnInput = (e: any) => {
      return e.target.tagName === 'INPUT' && e.target.type === 'text';
  };

  return (
    <div 
        ref={containerRef}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={`
            p-6 rounded-lg border-2 border-dashed transition-all relative outline-none
            ${isDragActive ? 'border-green-500 bg-green-900/20' : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'}
        `}
        tabIndex={0} 
    >
      <div className="flex flex-col items-center space-y-4">
        {files.length === 0 && !urlInput && (
            <div className="text-center space-y-2">
                <p className="text-gray-300 font-medium pointer-events-none">Drag & Drop files here, Paste (Ctrl+V)</p>
                <div className="flex items-center justify-center space-x-4">
                    <label className="cursor-pointer bg-gray-600 hover:bg-gray-500 text-white text-sm px-4 py-2 rounded-md transition">
                        Select Files
                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
                    </label>
                    <span className="text-gray-400 text-sm">- or -</span>
                    <input type="text" placeholder="Paste image URL..." className="bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-sm text-white w-64 focus:ring-2 focus:ring-green-500 outline-none" value={urlInput} onChange={(e) => { setUrlInput(e.target.value); if(e.target.value) setFiles([]); }} />
                </div>
            </div>
        )}

        {previewUrls.length > 0 && (
            <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm text-gray-400">{files.length > 0 ? `${files.length} file(s) selected` : 'External URL'}</h4>
                    <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300">Clear All</button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-60 overflow-y-auto custom-scrollbar">
                    {previewUrls.map((url, idx) => (
                        <div key={idx} className="relative group bg-gray-800 rounded-md border border-gray-600 aspect-square">
                            <img src={url} alt="Preview" className="w-full h-full object-cover rounded-md" />
                            {files.length > 0 && (
                                <button onClick={() => handleRemoveFile(idx)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"><XIcon /></button>
                            )}
                        </div>
                    ))}
                    {files.length > 0 && (
                         <label className="cursor-pointer flex flex-col items-center justify-center bg-gray-800/50 border-2 border-dashed border-gray-600 hover:border-gray-400 rounded-md aspect-square transition">
                            <span className="text-2xl text-gray-400">+</span>
                            <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileSelect} />
                        </label>
                    )}
                </div>
            </div>
        )}

        <div className="w-full flex flex-col items-center justify-center pt-2 space-y-2">
             {loading && <span className="text-sm text-blue-300 animate-pulse">{progress}</span>}
             <button onClick={handleSubmit} disabled={loading || previewUrls.length === 0} className={`flex items-center px-6 py-2 rounded-md font-semibold text-white transition-all ${loading || previewUrls.length === 0 ? 'bg-gray-600 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-green-500/30'}`}>
                {loading ? <span>Processing...</span> : <>{files.length > 0 ? <UploadIcon /> : <LinkIcon />}{files.length > 0 ? `Upload ${files.length} Files` : 'Save URL'}</>}
            </button>
        </div>
        {error && <p className="text-red-400 text-sm bg-red-900/20 px-3 py-1 rounded">{error}</p>}
        {success && <p className="text-green-400 text-sm bg-green-900/20 px-3 py-1 rounded">{success}</p>}
      </div>
    </div>
  );
};

export default UploadForm;