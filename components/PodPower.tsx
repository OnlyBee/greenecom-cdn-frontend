import React, { useState, useEffect, useCallback } from 'react';
import { PodFeatureSelector } from './PodFeatureSelector';
import { PodVariationGenerator } from './PodVariationGenerator';
import { PodMockupRemaker } from './PodMockupRemaker';
import { PodApiKeyModal } from './PodApiKeyModal';
import Modal from './Modal';
import { api } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import type { Feature } from '../podTypes';
import { Role } from '../types';

const PodPower: React.FC = () => {
  const { user } = useAuth();
  const [selectedFeature, setSelectedFeature] = useState<Feature>('variation');
  
  const [systemKey, setSystemKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);
  
  // Modals
  const [showAdminKeyModal, setShowAdminKeyModal] = useState(false);
  const [showMemberContactModal, setShowMemberContactModal] = useState(false);

  // Check if user is admin (case-insensitive check)
  const isAdmin = user?.role?.toUpperCase() === Role.ADMIN;

  // 1. Fetch Key from Server on Mount
  const fetchSystemKey = useCallback(async () => {
    if (!user) return;
    setLoadingKey(true);
    try {
        const key = await api.getSystemApiKey();
        setSystemKey(key);
        
        // If user is Admin and no key exists, prompt to enter one
        if (!key && isAdmin) {
            setShowAdminKeyModal(true);
        }
    } catch (e) {
        console.error("Failed to fetch API key");
    } finally {
        setLoadingKey(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchSystemKey();
  }, [fetchSystemKey]);

  // 2. Handle Key Save (Admin only)
  const handleSaveApiKey = async (newKey: string) => {
    try {
        await api.updateSystemApiKey(newKey);
        setSystemKey(newKey);
        setShowAdminKeyModal(false);
        // If Member modal was open (edge case), close it
        setShowMemberContactModal(false);
    } catch (e) {
        alert("Failed to save API Key to server.");
    }
  };

  // 3. Handle API Errors triggered by child components
  const handleApiError = useCallback(() => {
    // If the API call fails (403, 400, Quota), this is called.
    if (isAdmin) {
        // Admin: Show modal to update key
        setShowAdminKeyModal(true);
    } else {
        // Member: Show "Contact Admin" message
        setShowMemberContactModal(true);
    }
  }, [isAdmin]);

  return (
    <div className="min-h-screen text-gray-100 font-sans relative">
      
      {/* --- Admin: Update Key Modal --- */}
      {isAdmin && showAdminKeyModal && (
          <PodApiKeyModal
            isOpen={true}
            onClose={() => setShowAdminKeyModal(false)}
            onSave={handleSaveApiKey}
          />
      )}

      {/* --- Member: Contact Admin Modal --- */}
      <Modal 
        isOpen={showMemberContactModal} 
        onClose={() => setShowMemberContactModal(false)} 
        title="API Key Issue"
      >
          <div className="text-center p-4">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-gray-300 mb-4">
                  The system API Key has expired or is invalid. 
              </p>
              <p className="font-semibold text-white">
                  Please contact an Administrator to update the Gemini API Key.
              </p>
              <button 
                onClick={() => setShowMemberContactModal(false)}
                className="mt-6 bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded"
              >
                  Close
              </button>
          </div>
      </Modal>

      <div className="pb-8 relative">
        {/* Admin floating button to update key manually */}
        {isAdmin && (
            <div className="absolute top-0 right-0 z-10">
                <button 
                    onClick={() => setShowAdminKeyModal(true)}
                    className="text-xs bg-gray-800 border border-gray-600 hover:bg-gray-700 text-gray-400 px-3 py-1 rounded-full flex items-center gap-1 transition-colors shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    Update API Key
                </button>
            </div>
        )}

        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white tracking-wider">
            POD <span className="text-purple-500">Power</span>
            </h2>
            <p className="text-gray-400 mt-1">Your AI Assistant for Print-On-Demand Success</p>
        </div>

        {loadingKey ? (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        ) : (
            <>
                <PodFeatureSelector
                  selectedFeature={selectedFeature}
                  onSelectFeature={setSelectedFeature}
                />
                
                <div className="mt-8">
                  {/* Pass the systemKey down. If null, child will error immediately if they try to gen, triggering handleApiError */}
                  {selectedFeature === 'variation' && (
                    <PodVariationGenerator 
                        apiKey={systemKey || ''} 
                        onApiError={handleApiError} 
                    />
                  )}
                  {selectedFeature === 'mockup' && (
                    <PodMockupRemaker 
                        apiKey={systemKey || ''} 
                        onApiError={handleApiError} 
                    />
                  )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default PodPower;