import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

type Folder = {
  id: string;
  name: string;
  slug?: string;
};

type Props = {
  selectedFolder: Folder | null;
  onUploaded: () => void; // gọi lại để reload danh sách ảnh sau khi upload
};

const UploadForm: React.FC<Props> = ({ selectedFolder, onUploaded }) => {
  const { token } = useAuth() as any; // tuỳ kiểu anh đang dùng trong AuthContext

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      setStatus(`Ready to upload: ${f.name}`);
    }
  };

  // Dán ảnh từ clipboard (Ctrl+V) vào vùng upload
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.files;
    if (items && items.length > 0) {
      const imgFile = items[0];
      if (imgFile.type.startsWith('image/')) {
        setFile(imgFile);
        setStatus(`Pasted image: ${imgFile.name}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFolder) {
      setStatus('Please select a folder first.');
      return;
    }

    if (!file && !imageUrl.trim()) {
      setStatus('Choose a file, paste an image or enter an image URL.');
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1) Nếu có file -> dùng endpoint /api/upload (multipart)
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folderId', selectedFolder.id);
        // slug nếu DB anh có, nếu không có thì dùng name thường
        const slug = selectedFolder.slug || selectedFolder.name.toLowerCase().replace(/\s+/g, '-');
        formData.append('folderSlug', slug);

        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await resp.json();

        if (!resp.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        setStatus('Uploaded file successfully!');
      }

      // 2) Nếu không có file nhưng có URL -> dùng endpoint /api/upload/url
      else if (imageUrl.trim()) {
        const resp = await fetch('/api/upload/url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            folderId: selectedFolder.id,
            imageUrl: imageUrl.trim(),
          }),
        });

        const data = await resp.json();

        if (!resp.ok) {
          throw new Error(data.error || 'Upload by URL failed');
        }

        setStatus('Saved image URL successfully!');
      }

      // reset & reload list
      setFile(null);
      setImageUrl('');
      onUploaded();
    } catch (err: any) {
      console.error(err);
      setStatus(err.message || 'Failed to upload or save image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="rounded-md border border-dashed border-gray-600 p-4 mb-4"
        onPaste={handlePaste}
      >
        <p className="text-sm text-gray-400 mb-2">
          - Chọn file từ máy, hoặc<br />
          - Dán trực tiếp ảnh (Ctrl+V), hoặc<br />
          - Nhập URL ảnh bên dưới.
        </p>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm"
          />
        </div>

        <div className="mb-3">
          <input
            type="text"
            placeholder="Hoặc nhập link ảnh (https://...)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full rounded-md bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-gray-100"
          />
        </div>

        {status && (
          <p className="text-sm mt-1 text-red-400">
            {status}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || !selectedFolder}
        className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Uploading...' : 'Upload Image'}
      </button>
    </form>
  );
};

export default UploadForm;
