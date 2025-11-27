
import type { User, Folder, ImageFile } from '../types';

const API_BASE_URL = '/api';

const getToken = () => localStorage.getItem('greenecom_token');

const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const headers: any = { ...options.headers };
  const token = getToken();
  
  if (token && !(options.body instanceof FormData)) {
      headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const endpoint = url.startsWith('/') ? url : `/${url}`;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    let errorMsg = `HTTP error! status: ${response.status}`;
    try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorData.message || errorMsg;
    } catch (e) { }
    throw new Error(errorMsg);
  }
  
  if (response.status === 204) return null as T;
  return response.json();
};

export const api = {
  login: (u: string, p: string) => fetch(`${API_BASE_URL}/login`, {
      method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: u, password: p})
  }).then(r => r.ok ? r.json() : Promise.reject(r)),

  getAllUsers: () => request<User[]>('/users'),
  getAllFolders: () => request<Folder[]>('/folders'),
  getFoldersForUser: (id: string) => request<Folder[]>(`/users/${id}/folders`),
  getImagesInFolder: (id: string) => request<ImageFile[]>(`/folders/${id}/images`),
  
  uploadImage: async (file: File, folderId: string, folderName: string) => {
    const formData = new FormData();
    formData.append('folderId', folderId);
    formData.append('folderSlug', folderName.toLowerCase().replace(/\s/g,'-'));
    formData.append('image', file);
    const token = getToken();
    await fetch(`${API_BASE_URL}/upload`, { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : {}, body: formData });
  },

  uploadImageUrl: (imageUrl: string, folderId: string) => request<void>('/upload/url', { method: 'POST', body: JSON.stringify({ folderId, imageUrl }) }),
  renameImage: (id: string, name: string) => request(`/images/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteImage: (id: string) => request(`/images/${id}`, { method: 'DELETE' }),
  
  createUser: (u: string, p: string) => request('/users', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }),
  createFolder: (n: string) => request('/folders', { method: 'POST', body: JSON.stringify({ name: n }) }),
  assignUserToFolder: (uid: string, fid: string) => request('/folders/assign', { method: 'POST', body: JSON.stringify({ userId: uid, folderId: fid }) }),
  unassignUserFromFolder: (uid: string, fid: string) => request(`/folders/${fid}/users/${uid}`, { method: 'DELETE' }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),
  deleteFolder: (id: string) => request(`/folders/${id}`, { method: 'DELETE' }),
  changePassword: (c: string, n: string) => request('/users/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword: c, newPassword: n }) }),

  recordUsage: (feature: string) => request('/stats/record', { method: 'POST', body: JSON.stringify({ feature }) }),
  getStats: () => request<any[]>('/stats'),
};
