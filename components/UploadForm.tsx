import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

type Folder = {
  id: string;
  name: string;
  slug?: string;
};

type Props = {
  selectedFolder: Folder | null;
  onUploaded: () => void; // gọi lại để reload danh sách ảnh
};

const UploadForm: React.FC<Props> = ({ selectedFolder, onUploaded }) => {
  // useAuth của anh đang trả về { token, user, login, logout } (theo context mình đã sửa)
  const { token } = useAuth() as any;

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ====== PREVIEW (thumbnail) ======
  useEffect(() => {
    // nếu có file, dùng URL.createObjectURL
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    // nếu không có file nhưng có link
    if (!file && imageUrl.trim()) {
      setPreviewUrl(imageUrl.trim());
    } else {
      setPreviewUrl(null);
    }
  }, [file, imageUrl]);

  // ====== CHỌN FILE ======
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      // khi chọn file thì clear URL (để ưu tiên upload file)
      setImageUrl('');
      setStatus(`Ready to upload: ${f.name}`);
    } else {
      setStatus(null);
    }
  };

  // ====== DÁN ẢNH TỪ CLIPBOARD (Ctrl+V) ======
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const files = e.clipboardData.files;
    if (files && files.length > 0) {
      const imgFile = files[0];
      if (imgFile.type.startsWith('image/')) {
        setFile(imgFile);
        setImageUrl('');
        setStatus(`Pasted image: ${imgFile.name}`);
      }
    }
  };

  // ====== SUBMIT ======
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedFolder) {
      setStatus('Please select a folder first.');
      return;
    }

    if (!file && !imageUrl.trim()) {
      setStatus('Choose a file, paste an image or enter an image URL.');
      return;
    }

    if (!token) {
      setStatus('Token missing – please login again.');
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1) Có file -> gửi multipart tới /api/upload
      if (file) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folderId', selectedFolder.id);

        const slug =
          selectedFolder.slug ||
          selectedFolder.name.toLowerCase().replace(/\s+/g, '-');
        formData.append('folderSlug', slug);

        console.log('[Upload] POST /api/upload'); // giúp anh debug

        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        setStatus('Uploaded file successfully!');
      }
      // 2) Không có file nhưng có URL -> POST /api/upload/url
      else if (imageUrl.trim()) {
        console.log('[Upload] POST /api/upload/url');

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

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          throw new Error(data.error || 'Upload by URL failed');
        }

        setStatus('Saved image URL successfully!');
      }

      // reset & reload
      setFile(null);
      setImageUrl('');
      onUploaded();
    } catch (err: any) {
      console.error('Upload error:', err);
      setStatus(err.message || 'Failed to upload or save image.');
    } finally {
      setLoading(false);
    }
  };

  // ====== UI ======
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

        {/* Chọn file */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="text-sm"
          />
        </div>

        {/* Nhập URL */}
        <div className="mb-3">
          <input
            type="text"
            placeholder="Hoặc nhập link ảnh (https://...)"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              if (e.target.value) {
                setFile(null); // ưu tiên URL nếu đang nhập
                setStatus('Ready to upload from URL');
              }
            }}
            className="w-full rounded-md bg-gray-800 border border-gray-600 px-3 py-2 text-sm text-gray-100"
          />
        </div>

        {/* Thumbnail preview */}
        {previewUrl && (
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1">Preview:</p>
            <img
              src={previewUrl}
              alt="preview"
              className="max-h-40 rounded-md border border-gray-700"
            />
          </div>
        )}

        {/* Status line */}
        {status && (
          <p className="text-sm mt-1 text-red-400">
            {status}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => handleSubmit()}
        disabled={loading || !selectedFolder}
        className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Uploading...' : 'Upload Image'}
      </button>
    </form>
  );
};

export default UploadForm;
