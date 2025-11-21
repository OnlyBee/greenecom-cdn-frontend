import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import ChangePasswordModal from './ChangePasswordModal';

interface HeaderProps {
  currentView?: 'cdn' | 'pod_power';
  onChangeView?: (view: 'cdn' | 'pod_power') => void;
}

const Header: React.FC<HeaderProps> = ({ currentView = 'cdn', onChangeView }) => {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className="bg-gray-800 shadow-md sticky top-0 z-40 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <span className="font-bold text-xl text-green-400 tracking-tight">Greenecom<span className="text-white">Hub</span></span>
              </div>
              
              {onChangeView && (
                <nav className="hidden md:flex space-x-2">
                  <button
                    onClick={() => onChangeView('cdn')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === 'cdn' 
                        ? 'bg-gray-900 text-green-400 border border-gray-600' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    CDN Manager
                  </button>
                  <button
                    onClick={() => onChangeView('pod_power')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === 'pod_power' 
                        ? 'bg-gray-900 text-purple-400 border border-gray-600' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    POD Power
                  </button>
                </nav>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-xs text-gray-400">Signed in as</span>
                <span className="text-sm font-medium text-white leading-none">{user?.username}</span>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                title="Change Password"
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </button>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
              </button>
            </div>
          </div>
        </div>
        
        {onChangeView && (
          <div className="md:hidden border-t border-gray-700 flex">
              <button
                  onClick={() => onChangeView('cdn')}
                  className={`flex-1 py-3 text-center text-sm font-medium ${currentView === 'cdn' ? 'bg-gray-700 text-green-400' : 'text-gray-400'}`}
              >
                  CDN Manager
              </button>
              <button
                  onClick={() => onChangeView('pod_power')}
                  className={`flex-1 py-3 text-center text-sm font-medium ${currentView === 'pod_power' ? 'bg-gray-700 text-purple-400' : 'text-gray-400'}`}
              >
                  POD Power
              </button>
          </div>
        )}
      </header>
      <ChangePasswordModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default Header;
