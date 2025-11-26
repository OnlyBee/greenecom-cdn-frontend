import type { User, Folder, ImageFile } from '../types';

const API_BASE_URL = '/api';

const getToken = () => localStorage.getItem('greenecom_token');

const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const headers: HeadersInit = {
    ...options.headers,
  };
  const token = getToken();
  if (token && !(options.body instanceof FormData)) {
      headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const endpoint = url.startsWith('/') ? url : `/${url}`;
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP error! status: ${response.status}`;
    try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorData.message || errorData.code || errorMsg;
    } catch (e) { }
    throw new Error(errorMsg);
  }
  
  if (response.status === 204) {
      return null as T;
  }

  return response.json();
};

const slugify = (text: string) => {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

export const api = {
  async login(username: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) throw new Error('Invalid credentials');
    const data = await response.json();
    return data.user;
  },

  getAllUsers: () => request<User[]>('/users'),
  getAllFolders: () => request<Folder[]>('/folders'),
  getFoldersForUser: (userId: string) => request<Folder[]>(`/users/${userId}/folders`),
  getImagesInFolder: (folderId: string) => request<ImageFile[]>(`/folders/${folderId}/images`),

  async uploadImage(file: File, folderId: string, folderName: string): Promise<void> {
    const folderSlug = slugify(folderName);
    const formData = new FormData();
    formData.append('folderId', folderId);
    formData.append('folderSlug', folderSlug);
    formData.append('image', file);
    
    const token = getToken();
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers,
        body: formData,
    });
     if (!response.ok) {
        let errorMsg = 'Upload failed';
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || `Server Error: ${errorData.code || response.status}`;
        } catch (e) {
            errorMsg = `Upload failed (Status: ${response.status})`;
        }
        throw new Error(errorMsg);
    }
  },

  async uploadImageUrl(imageUrl: string, folderId: string): Promise<void> {
      return request<void>('/upload/url', {
          method: 'POST',
          body: JSON.stringify({ folderId, imageUrl })
      });
  },

  renameImage: (imageId: string, newName: string) => request<ImageFile>(`/images/${imageId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: newName })
  }),

  createUser: (username: string, password: string) => request<User>('/users', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),

  createFolder: (name: string) => request<Folder>('/folders', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),

  assignUserToFolder: (userId: string, folderId: string) => request<void>('/folders/assign', {
    method: 'POST',
    body: JSON.stringify({ userId, folderId }),
  }),

  unassignUserFromFolder: (userId: string, folderId: string) => request<void>(`/folders/${folderId}/users/${userId}`, {
    method: 'DELETE',
  }),

  changePassword: (currentPassword: string, newPassword: string) => request<void>('/users/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  }),
  
  deleteImage: (imageId: string) => request<void>(`/images/${imageId}`, {
    method: 'DELETE',
  }),

  deleteUser: (userId: string) => request<void>(`/users/${userId}`, {
    method: 'DELETE',
  }),

  deleteFolder: (folderId: string) => request<void>(`/folders/${folderId}`, {
    method: 'DELETE',
  }),
};