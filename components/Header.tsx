
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="font-bold text-xl text-green-400">Greenecom CDN</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-300 mr-4">Welcome, <span className="font-medium text-white">{user?.username}</span></span>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-gray-700 hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
