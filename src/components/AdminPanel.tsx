
import React, { useState, useEffect } from 'react';
import type { User, Folder } from '../types';
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
  
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
      api.getStats().then(setStats).catch(console.error);
  }, []); // Fetch stats on mount

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword) { setError('Required'); return; }
    setLoading(true);
    try { await api.createUser(newUsername, newPassword); setUserModalOpen(false); setNewUsername(''); setNewPassword(''); onUpdate(); } 
    catch (e) { setError('Failed'); } finally { setLoading(false); }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) { setError('Required'); return; }
    setLoading(true);
    try { await api.createFolder(newFolderName); setFolderModalOpen(false); setNewFolderName(''); onUpdate(); } 
    catch (e) { setError('Failed'); } finally { setLoading(false); }
  };

  const handleAssignUser = async () => {
    if(!assigningFolder || !selectedUserId) return;
    setLoading(true);
    try { await api.assignUserToFolder(selectedUserId, assigningFolder.id); setAssigningFolder(null); setSelectedUserId(''); onUpdate(); } 
    catch(e) { setError('Failed'); } finally { setLoading(false); }
  };
  
  const handleUnassignUser = async (userId: string, folderId: string) => {
    if(!window.confirm('Remove access?')) return;
    try { await api.unassignUserFromFolder(userId, folderId); onUpdate(); } catch (e) { alert('Failed'); }
  };
  
  const handleDeleteUser = async (userId: string, username: string) => {
    if (window.confirm(`Delete ${username}?`)) {
        setLoading(true);
        try { await api.deleteUser(userId); onUpdate(); } catch (e) { setError('Failed'); } finally { setLoading(false); }
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (window.confirm(`Delete ${folderName}?`)) {
        setLoading(true);
        try { await api.deleteFolder(folderId); onUpdate(); } catch (e) { setError('Failed'); } finally { setLoading(false); }
    }
  };

  const memberUsers = users.filter(u => u.role !== 'ADMIN');

  return (
    <div className="space-y-6">
        {/* MAIN ADMIN CONTROLS */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-4">
        <h2 className="text-xl font-bold mb-3 text-white">Management</h2>
        <div className="flex space-x-3 mb-4">
            <button onClick={() => setUserModalOpen(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white font-semibold">Create User</button>
            <button onClick={() => setFolderModalOpen(true)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-sm text-white font-semibold">Create Folder</button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
            {/* Users List */}
            <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-1 uppercase">Users</h3>
                <ul className="bg-gray-700/50 rounded border border-gray-600/50 max-h-64 overflow-y-auto p-2 space-y-2">
                    {memberUsers.map(user => 
                        <li key={user.id} className="flex flex-col bg-gray-800 p-2 rounded">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-white">{user.username}</span>
                                <button onClick={() => handleDeleteUser(user.id, user.username)} className="text-red-400"><TrashIcon /></button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {user.assigned_folders?.map(f => (
                                    <span key={f.id} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-600 text-gray-200 border border-gray-500 flex items-center">
                                        {f.name}
                                        <button onClick={() => handleUnassignUser(user.id, f.id)} className="ml-1 hover:text-red-400">&times;</button>
                                    </span>
                                ))}
                            </div>
                        </li>
                    )}
                </ul>
            </div>
            {/* Folders List */}
            <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-1 uppercase">Folders</h3>
                <ul className="bg-gray-700/50 rounded border border-gray-600/50 max-h-64 overflow-y-auto p-2 space-y-2">
                    {folders.map(folder => (
                        <li key={folder.id} className="flex flex-col bg-gray-800 p-2 rounded">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-white">{folder.name}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setAssigningFolder(folder)} className="text-[10px] bg-green-600 px-1.5 rounded text-white">+ Assign</button>
                                    <button onClick={() => handleDeleteFolder(folder.id, folder.name)} className="text-red-400"><TrashIcon /></button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {folder.assigned_users?.map(u => (
                                    <span key={u.id} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-900 text-blue-100 border border-blue-800 flex items-center">
                                        {u.username}
                                        <button onClick={() => handleUnassignUser(u.id, folder.id)} className="ml-1 hover:text-red-400">&times;</button>
                                    </span>
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        </div>

        {/* STATS TABLE */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-4">
            <h2 className="text-xl font-bold mb-3 text-white">POD Usage Statistics</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-700 text-gray-200 uppercase">
                        <tr>
                            <th className="px-4 py-2">User</th>
                            <th className="px-4 py-2">Variation Gens</th>
                            <th className="px-4 py-2">Mockup Gens</th>
                            <th className="px-4 py-2">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {stats.map((stat, idx) => (
                            <tr key={idx} className="hover:bg-gray-700/50">
                                <td className="px-4 py-2 font-medium text-white">{stat.username}</td>
                                <td className="px-4 py-2 text-green-400">{stat.variation_count}</td>
                                <td className="px-4 py-2 text-purple-400">{stat.mockup_count}</td>
                                <td className="px-4 py-2 font-bold text-white">{stat.total_count}</td>
                            </tr>
                        ))}
                        {stats.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center">No data recorded yet.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>

        {/* MODALS */}
        <Modal isOpen={isUserModalOpen} onClose={() => setUserModalOpen(false)} title="Create User">
            <div className="space-y-3">
                <input type="text" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white" />
                <input type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white" />
                <button onClick={handleCreateUser} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded">{loading ? 'Creating...' : 'Create'}</button>
            </div>
        </Modal>
        <Modal isOpen={isFolderModalOpen} onClose={() => setFolderModalOpen(false)} title="Create Folder">
            <div className="space-y-3">
                <input type="text" placeholder="Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white" />
                <button onClick={handleCreateFolder} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded">{loading ? 'Creating...' : 'Create'}</button>
            </div>
        </Modal>
        <Modal isOpen={!!assigningFolder} onClose={() => setAssigningFolder(null)} title="Assign User">
            <div className="space-y-3">
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="w-full bg-gray-700 p-2 rounded text-white">
                    <option value="">Select User</option>
                    {memberUsers.map(u => <option key={u.id} value={u.id} disabled={assigningFolder?.assigned_users?.some(au => au.id === u.id)}>{u.username}</option>)}
                </select>
                <button onClick={handleAssignUser} disabled={loading || !selectedUserId} className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded">Assign</button>
            </div>
        </Modal>
    </div>
  );
};

export default AdminPanel;