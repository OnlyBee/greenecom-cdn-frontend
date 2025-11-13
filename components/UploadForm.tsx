import React, { useState, useRef } from 'react';
import { api } from '../services/api';

interface UploadFormProps {
  folderId: string;
  onUploadSuccess: () => void;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const UploadForm: React.FC<UploadFormProps> = ({ folderId, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImageUrl(''); // Clear the URL if a file is selected
    }
  };
  
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setFile(null); // Clear the file if a URL is being typed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !imageUrl) {
      setError('Please select a file or enter an image URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const uploadData = file ? file : imageUrl;
      await api.uploadImage(uploadData, folderId);
      setSuccess('Image uploaded successfully!');
      onUploadSuccess();
      
      // Reset form
      setFile(null);
      setImageUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className="bg-gray-700/50 p-6 rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">
              Upload from your computer
            </label>
            <input 
                ref={fileInputRef}
                id="file-upload" 
                type="file" 
                onChange={handleFileChange} 
                accept="image/*" 
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
            />
        </div>
        
        <div className="flex items-center">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
        </div>

        <div>
            <label htmlFor="image-url" className="block text-sm font-medium text-gray-300 mb-2">
                Paste an image URL
            </label>
            <input
              id="image-url"
              type="text"
              value={imageUrl}
              onChange={handleUrlChange}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
        </div>
        
        <div className="pt-2">
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:bg-green-800 disabled:opacity-50">
                <UploadIcon/>
                {loading ? 'Uploading...' : 'Upload Image'}
            </button>
        </div>
      </form>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-4 text-sm text-green-400">{success}</p>}
    </div>
  );
};

export default UploadForm;