import React from 'react';
import type { Folder } from '../types';

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
}

const FolderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
);

const FolderList: React.FC<FolderListProps> = ({ folders, selectedFolderId, onSelectFolder }) => {
  if (folders.length === 0) {
    return <p className="text-gray-400 text-sm">No folders assigned.</p>;
  }

  return (
    <nav className="bg-gray-800 rounded-lg p-2 space-y-1">
      {folders.map((folder) => {
        const isSelected = folder.id === selectedFolderId;
        return (
          <button
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            className={`w-full flex items-center px-3 py-2 text-left text-sm font-medium rounded-md transition-colors ${
              isSelected
                ? 'bg-green-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <FolderIcon />
            <span className="truncate">{folder.name}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default FolderList;
