import React, { useState, useRef } from 'react';
import { api } from '../services/api';

interface UploadFormProps {
  folderId: string;
  folderName: string;
  onUploadSuccess: () => void;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const UploadForm: React.FC<UploadFormProps> = ({ folderId, folderName, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.uploadImage(file, folderId, folderName);
      setSuccess('Image uploaded successfully!');
      onUploadSuccess();
      
      // Reset form
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
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
        
        <div className="pt-2">
            <button type="submit" disabled={loading || !file} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 disabled:bg-green-800 disabled:opacity-50">
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
