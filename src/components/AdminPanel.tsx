
import React, { useState, useEffect } from 'react';
import type { User, Folder, UsageStat } from '../types';
import { api } from '../services/api';
import Modal from './Modal';

interface AdminPanelProps {
  users: User[];
  folders: Folder[];
  onUpdate: () => void;
}

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ChartIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
    </svg>
);

const AdminPanel: React.FC<AdminPanelProps> = ({ users, folders, onUpdate }) => {
  const [isUserModalOpen, setUserModalOpen] = useState(false);
  const [isFolderModalOpen, setFolderModalOpen] = useState(false);
  
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  
  const [assigningFolder, setAssigningFolder] = useState<Folder | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<UsageStat[]>([]);
  
  useEffect(() => {
    // Fetch stats separately to avoid bloat in parent component
    api.getUsageStats()
      .then(setStats)
      .catch(console.error);
  }, []); // Run once on mount

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword) {
      setError('Username and password are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.createUser(newUsername, newPassword);
      setUserModalOpen(false);
      setNewUsername('');
      setNewPassword('');
      onUpdate();
    } catch (e) {
      setError('Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) {
        setError('Folder name is required.');
        return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.createFolder(newFolderName);
      setFolderModalOpen(false);
      setNewFolderName('');
      onUpdate();
    } catch (e) {
        setError('Failed to create folder.');
    } finally {
        setLoading(false);
    }
  };

  const handleAssignUser = async () => {
    if(!assigningFolder || !selectedUserId) return;
    setLoading(true);
    setError(null);
    try {
      await api.assignUserToFolder(selectedUserId, assigningFolder.id);
      setAssigningFolder(null);
      setSelectedUserId('');
      onUpdate();
    } catch(e) {
        setError('Failed to assign user.');
    } finally {
        setLoading(false);
    }
  };
  
  const handleUnassignUser = async (userId: string, folderId: string) => {
    if(!window.confirm('Remove this access?')) return;
    try {
        await api.unassignUserFromFolder(userId, folderId);
        onUpdate();
    } catch (e) {
        alert('Failed to unassign user.');
    }
  };
  
  const handleDeleteUser = async (userId: string, username: string) => {
    if (window.confirm(`Delete user "${username}"?`)) {
        setLoading(true);
        setError(null);
        try {
            await api.deleteUser(userId);
            onUpdate();
        } catch (e: any) {
            setError(e.message || 'Failed to delete user.');
        } finally {
            setLoading(false);
        }
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (window.confirm(`Delete folder "${folderName}"? All images will be lost.`)) {
        setLoading(true);
        setError(null);
        try {
            await api.deleteFolder(folderId);
            onUpdate();
        } catch (e) {
            setError('Failed to delete folder.');
        } finally {
            setLoading(false);
        }
    }
  };

  const memberUsers = users.filter(u => u.role !== 'ADMIN');

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-white">Admin Panel</h2>
        {/* Stats Summary */}
        <div className="flex space-x-4 bg-gray-900/50 p-2 rounded-lg border border-gray-700">
           {stats.length > 0 ? stats.map(stat => (
               <div key={stat.feature_name} className="flex flex-col items-center px-2">
                   <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{stat.feature_name}</span>
                   <span className="text-lg font-bold text-purple-400">{stat.usage_count}</span>
               </div>
           )) : (
               <span className="text-xs text-gray-500 px-2 italic">No usage stats</span>
           )}
        </div>
      </div>
      
      <div className="flex space-x-3 mb-4">
        <button onClick={() => setUserModalOpen(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white font-semibold">Create User</button>
        <button onClick={() => setFolderModalOpen(true)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-sm text-white font-semibold">Create Folder</button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-1 uppercase tracking-wide">Users ({memberUsers.length})</h3>
            <ul className="bg-gray-700/50 rounded border border-gray-600/50 max-h-64 overflow-y-auto divide-y divide-gray-600/50">
                {memberUsers.map(user => 
                    <li key={user.id} className="p-2 flex flex-col space-y-1 hover:bg-gray-700/80">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-white text-sm">{user.username}</span>
                            <button onClick={() => handleDeleteUser(user.id, user.username)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-600"><TrashIcon /></button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                             {user.assigned_folders && user.assigned_folders.length > 0 ? (
                                user.assigned_folders.map(f => (
                                    <span key={f.id} className="flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-600 text-gray-200 border border-gray-500 group">
                                        {f.name}
                                        <button onClick={() => handleUnassignUser(user.id, f.id)} className="ml-1 text-gray-400 hover:text-red-400">&times;</button>
                                    </span>
                                ))
                             ) : <span className="text-[10px] text-gray-500 italic">No folders</span>}
                        </div>
                    </li>
                )}
            </ul>
        </div>

        <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-1 uppercase tracking-wide">Folders ({folders.length})</h3>
             <ul className="bg-gray-700/50 rounded border border-gray-600/50 max-h-64 overflow-y-auto divide-y divide-gray-600/50">
                {folders.map(folder => (
                    <li key={folder.id} className="p-2 flex flex-col space-y-1 hover:bg-gray-700/80">
                        <div className="flex justify-between items-center gap-2">
                            <span className="font-medium text-white text-sm truncate">{folder.name}</span>
                            <div className="flex-shrink-0 flex items-center gap-1">
                                <button onClick={() => setAssigningFolder(folder)} className="text-[10px] bg-green-600 hover:bg-green-700 text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">+ Assign</button>
                                <button onClick={() => handleDeleteFolder(folder.id, folder.name)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-600"><TrashIcon /></button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {folder.assigned_users && folder.assigned_users.length > 0 ? (
                                folder.assigned_users.map(u => (
                                    <span key={u.id} className="flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-900/80 text-blue-100 border border-blue-800">
                                        {u.username}
                                        <button onClick={() => handleUnassignUser(u.id, folder.id)} className="ml-1 text-blue-300 hover:text-red-400">&times;</button>
                                    </span>
                                ))
                            ) : <span className="text-[10px] text-gray-500 italic">No users</span>}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
      </div>
      
      <Modal isOpen={isUserModalOpen} onClose={() => setUserModalOpen(false)} title="Create New User">
        <div className="space-y-3">
          <input type="text" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white text-sm" />
          <input type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white text-sm" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button onClick={handleCreateUser} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm font-medium">
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={isFolderModalOpen} onClose={() => setFolderModalOpen(false)} title="Create New Folder">
        <div className="space-y-3">
            <input type="text" placeholder="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white text-sm" />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button onClick={handleCreateFolder} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded text-sm font-medium">
                {loading ? 'Creating...' : 'Create Folder'}
            </button>
        </div>
      </Modal>

      <Modal isOpen={!!assigningFolder} onClose={() => setAssigningFolder(null)} title={`Assign User to ${assigningFolder?.name}`}>
        <div className="space-y-3">
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white text-sm">
                <option value="">Select a user</option>
                {memberUsers.map(u => {
                    const isAssigned = assigningFolder?.assigned_users?.some(au => au.id === u.id);
                    return (
                        <option key={u.id} value={u.id} disabled={isAssigned}>
                            {u.username} {isAssigned ? '(Already assigned)' : ''}
                        </option>
                    );
                })}
            </select>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button onClick={handleAssignUser} disabled={loading || !selectedUserId} className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded text-sm font-medium disabled:opacity-50">
                {loading ? 'Assigning...' : 'Assign User'}
            </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPanel;
