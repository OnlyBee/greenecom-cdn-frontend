
import React, { useState, useEffect } from 'react';
import type { Folder, ImageFile, User } from '../types';
import { Role } from '../types';
import { useAuth } from '../hooks/useAuth';
import Header from './Header';
import UploadForm from './UploadForm';
import ImageGrid from './ImageGrid';
import AdminPanel from './AdminPanel';
import FolderList from './FolderList';
import PodPower from './PodPower'; // Import component mới
import { api } from '../services/api';

type ViewType = 'cdn' | 'pod_power';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  
  // State để quản lý đang xem màn hình nào
  const [currentView, setCurrentView] = useState<ViewType>('cdn');

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

      const selectedFolderStillExists = selectedFolder && availableFolders.some(f => f.id === selectedFolder);
      
      if (!selectedFolderStillExists) {
          if (availableFolders.length > 0) {
              setSelectedFolder(availableFolders[0].id);
          } else {
              setSelectedFolder(null);
          }
      }

    } catch (e: any) {
      setError(e.message || 'Failed to fetch data.');
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
    } catch (e: any) {
        setError(e.message || 'Failed to fetch images.');
        setImages([]);
    }
  };

  useEffect(() => {
    if (currentView === 'cdn') {
        fetchData();
    }
  }, [user, currentView]);

  useEffect(() => {
    if (currentView === 'cdn' && selectedFolder) {
      fetchImages();
    }
  }, [selectedFolder, currentView]);

  const handleUploadSuccess = () => {
    fetchImages();
  };
  
  const handleDataUpdate = () => {
    fetchData();
  }

  const handleDeleteImage = async (imageId: string) => {
    try {
        await api.deleteImage(imageId);
        fetchImages();
    } catch (e) {
        console.error("Failed to delete image:", e);
        alert('An error occurred while deleting the image.');
    }
  };

  const handleRenameImage = async (imageId: string, newName: string) => {
      try {
          await api.renameImage(imageId, newName);
          fetchImages(); 
      } catch (e: any) {
          console.error("Failed to rename image:", e);
          alert(e.message || 'Failed to rename image.');
      }
  };

  const currentFolderName = folders.find(f => f.id === selectedFolder)?.name || 'Select a folder';

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <Header currentView={currentView} onChangeView={setCurrentView} />
      
      <main className="flex-grow p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* --- VIEW: POD POWER --- */}
          {currentView === 'pod_power' && (
             <PodPower />
          )}

          {/* --- VIEW: CDN MANAGER --- */}
          {currentView === 'cdn' && (
            <>
                {user?.role === Role.ADMIN && (
                    <AdminPanel users={allUsers} folders={allFolders} onUpdate={handleDataUpdate} />
                )}

                <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="md:col-span-3">
                        <h2 className="text-xl font-bold mb-4 text-white">Folders</h2>
                        {isLoading ? (
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-gray-700 rounded"></div>
                                        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <FolderList 
                                folders={folders}
                                selectedFolderId={selectedFolder}
                                onSelectFolder={setSelectedFolder}
                            />
                        )}
                    </div>
                    
                    <div className="md:col-span-9">
                    {error ? (
                        <p className="text-red-400 bg-red-900/20 p-4 rounded">{error}</p>
                    ) : !selectedFolder && !isLoading ? (
                        <div className="bg-gray-800 rounded-lg shadow-xl p-6 h-64 flex items-center justify-center border border-gray-700">
                            <div className="text-center">
                                <p className="text-gray-400 text-lg mb-2">No Folder Selected</p>
                                <p className="text-gray-500 text-sm">
                                    {folders.length > 0 ? 'Select a folder from the list to view images.' : 'You are not assigned to any folders.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-800 rounded-lg shadow-xl p-4 md:p-6 border border-gray-700">
                            <h2 className="text-2xl font-bold mb-4 text-white flex items-center">
                                <span className="text-green-500 mr-2">/</span> {currentFolderName}
                            </h2>
                            <UploadForm 
                                folderId={selectedFolder!} 
                                folderName={currentFolderName}
                                onUploadSuccess={handleUploadSuccess} 
                            />
                            <div className="mt-8 border-t border-gray-700 pt-8">
                                <h3 className="text-xl font-semibold mb-4 text-white flex items-center justify-between">
                                    <span>Images <span className="text-sm font-normal text-gray-500 ml-2">({images.length})</span></span>
                                </h3>
                                <ImageGrid 
                                    images={images} 
                                    onDelete={handleDeleteImage} 
                                    onRename={handleRenameImage}
                                />
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
