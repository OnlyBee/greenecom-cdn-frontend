import React from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {user ? <Dashboard /> : <Login />}
    </div>
  );
};

export default App;
