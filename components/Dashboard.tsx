import React, { useState, useEffect } from 'react';
import type { Folder, ImageFile, User } from '../types';
import { Role } from '../types';
import { useAuth } from '../hooks/useAuth';
import Header from './Header';
import UploadForm from './UploadForm';
import ImageGrid from './ImageGrid';
import AdminPanel from './AdminPanel';
import FolderList from './FolderList';
import { api } from '../services/api';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      let availableFolders: Folder[] = [];
      if (user.role === Role.ADMIN) {
        const [usersData, foldersData] = await Promise.all([
          api.getAllUsers(),
          api.getAllFolders(),
        ]);
        setAllUsers(usersData);
        setAllFolders(foldersData);
        availableFolders = foldersData;
      } else {
        const userFolders = await api.getFoldersForUser(user.id);
        availableFolders = userFolders;
      }
      setFolders(availableFolders);

      // Post-fetch logic for selecting a folder
      const selectedFolderStillExists = selectedFolder && availableFolders.some(f => f.id === selectedFolder);
      
      if (!selectedFolderStillExists) {
          if (availableFolders.length > 0) {
              setSelectedFolder(availableFolders[0].id);
          } else {
              setSelectedFolder(null); // No folders available
          }
      }
      // If selected folder still exists, we don't need to do anything.

    } catch (e) {
      setError('Failed to fetch data.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchImages = async () => {
    if (!selectedFolder) {
        setImages([]);
        return;
    };
    try {
        const folderImages = await api.getImagesInFolder(selectedFolder);
        setImages(folderImages);
    } catch (e) {
        setError('Failed to fetch images.');
        setImages([]);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (selectedFolder) {
      fetchImages();
    } else {
      // Clear images if no folder is selected
      setImages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFolder]);

  const handleUploadSuccess = () => {
    fetchImages();
  };
  
  const handleDataUpdate = () => {
    fetchData();
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!selectedFolder) return;

    try {
        await api.deleteImage(imageId, selectedFolder);
        fetchImages(); // Refetch images to update the UI
    } catch (e) {
        console.error("Failed to delete image:", e);
        alert('An error occurred while deleting the image.');
    }
  };

  const currentFolderName = folders.find(f => f.id === selectedFolder)?.name || 'Select a folder';

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {user?.role === Role.ADMIN && (
            <AdminPanel users={allUsers} folders={allFolders} onUpdate={handleDataUpdate} />
          )}

          <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Folder List Sidebar */}
            <div className="md:col-span-3">
                <h2 className="text-xl font-bold mb-4 text-white">Folders</h2>
                {isLoading ? (
                    <p>Loading folders...</p>
                ) : (
                    <FolderList 
                        folders={folders}
                        selectedFolderId={selectedFolder}
                        onSelectFolder={setSelectedFolder}
                    />
                )}
            </div>
            
            {/* Main Content */}
            <div className="md:col-span-9">
              {error ? (
                <p className="text-red-400">{error}</p>
              ) : !selectedFolder && !isLoading ? (
                  <div className="bg-gray-800 rounded-lg shadow-xl p-6 h-full flex items-center justify-center">
                    <p className="text-gray-400">
                        {folders.length > 0 ? 'Select a folder to start.' : 'You are not assigned to any folders. Please contact an administrator.'}
                    </p>
                  </div>
              ) : (
                <div className="bg-gray-800 rounded-lg shadow-xl p-4 md:p-6">
                    <h2 className="text-2xl font-bold mb-4 text-white">
                        {currentFolderName}
                    </h2>
                    <UploadForm folderId={selectedFolder!} onUploadSuccess={handleUploadSuccess} />
                    <div className="mt-8 border-t border-gray-700 pt-8">
                        <h3 className="text-xl font-semibold mb-4 text-white">Images</h3>
                        <ImageGrid images={images} onDelete={handleDeleteImage} />
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
