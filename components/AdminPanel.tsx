
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

const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
  
  const fetchStats = () => {
    api.getUsageStats()
      .then(data => {
          if (data) setStats(data);
      })
      .catch(err => console.error("Failed to fetch stats", err));
  };

  useEffect(() => {
    fetchStats();
  }, []);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-gray-700 pb-4">
        <div>
            <h2 className="text-xl font-bold text-white">Admin Panel</h2>
            <div className="flex space-x-3 mt-2">
                <button onClick={() => setUserModalOpen(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white font-semibold">Create User</button>
                <button onClick={() => setFolderModalOpen(true)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-sm text-white font-semibold">Create Folder</button>
            </div>
        </div>

        {/* --- USAGE STATISTICS DASHBOARD --- */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 w-full md:w-auto min-w-[320px] shadow-inner">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wide flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                    AI Usage Stats
                </h3>
                <button onClick={fetchStats} className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-800 transition-colors" title="Refresh Stats">
                    <RefreshIcon/>
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                        <tr>
                            <th className="px-3 py-2 rounded-l-md">Feature</th>
                            <th className="px-3 py-2 text-right">Runs</th>
                            <th className="px-3 py-2 text-right rounded-r-md">Last Used</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {stats.length > 0 ? stats.map(stat => (
                            <tr key={stat.feature_name} className="hover:bg-gray-800/30 transition-colors">
                                <td className="px-3 py-2 font-medium text-white capitalize">{stat.feature_name}</td>
                                <td className="px-3 py-2 text-right font-bold text-green-400">{stat.usage_count}</td>
                                <td className="px-3 py-2 text-right text-xs text-gray-500 font-mono">
                                    {new Date(stat.last_used_at).toLocaleDateString()}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="px-3 py-4 text-center text-gray-500 italic text-xs">
                                    No usage data yet. <br/> Generate some images!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        {/* ---------------------------------- */}
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
    