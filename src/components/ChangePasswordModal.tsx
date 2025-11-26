
import React, { useState } from 'react';
import { api } from '../services/api';
import Modal from './Modal';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
    }

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully!');
      setTimeout(() => { handleClose(); }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(null);
      setLoading(false);
      onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change Your Password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" placeholder="Current Password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full bg-gray-700 p-2 rounded text-white placeholder-gray-400" />
        <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full bg-gray-700 p-2 rounded text-white placeholder-gray-400" />
        <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full bg-gray-700 p-2 rounded text-white placeholder-gray-400" />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}
        <div className="flex justify-end space-x-4 pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-semibold">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-blue-800 font-semibold">{loading ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;