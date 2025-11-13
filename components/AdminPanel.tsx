
import React, { useState } from 'react';
import type { User, Folder } from '../types';
import { api } from '../services/api';

interface AdminPanelProps {
  users: User[];
  folders: Folder[];
  onUpdate: () => void;
}

// NOTE: This component is defined outside AdminPanel to avoid re-rendering issues.
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
};

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

  const memberUsers = users.filter(u => u.role !== 'ADMIN');

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-6">
      <h2 className="text-2xl font-bold mb-4 text-white">Admin Panel</h2>
      <div className="flex space-x-4 mb-6">
        <button onClick={() => setUserModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-semibold">Create User</button>
        <button onClick={() => setFolderModalOpen(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-semibold">Create Folder</button>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* User Management */}
        <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Users ({memberUsers.length})</h3>
            <ul className="bg-gray-700/50 rounded-md p-2 max-h-60 overflow-y-auto">
                {memberUsers.map(user => <li key={user.id} className="p-2 text-gray-300">{user.username}</li>)}
            </ul>
        </div>

        {/* Folder Management */}
        <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Folders ({folders.length})</h3>
             <ul className="bg-gray-700/50 rounded-md p-2 max-h-60 overflow-y-auto">
                {folders.map(folder => (
                    <li key={folder.id} className="p-2 text-gray-300 flex justify-between items-center">
                        <span>{folder.name}</span>
                        <button onClick={() => setAssigningFolder(folder)} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded">Assign User</button>
                    </li>
                ))}
            </ul>
        </div>
      </div>
      
      {/* Create User Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setUserModalOpen(false)} title="Create New User">
        <div className="space-y-4">
          <input type="text" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white" />
          <input type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white" />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleCreateUser} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded disabled:bg-blue-800">
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </Modal>

      {/* Create Folder Modal */}
      <Modal isOpen={isFolderModalOpen} onClose={() => setFolderModalOpen(false)} title="Create New Folder">
        <div className="space-y-4">
            <input type="text" placeholder="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white" />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleCreateFolder} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded disabled:bg-indigo-800">
                {loading ? 'Creating...' : 'Create Folder'}
            </button>
        </div>
      </Modal>

      {/* Assign User Modal */}
      <Modal isOpen={!!assigningFolder} onClose={() => setAssigningFolder(null)} title={`Assign User to ${assigningFolder?.name}`}>
        <div className="space-y-4">
            <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white">
                <option value="">Select a user</option>
                {memberUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button onClick={handleAssignUser} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded disabled:bg-green-800">
                {loading ? 'Assigning...' : 'Assign User'}
            </button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPanel;
