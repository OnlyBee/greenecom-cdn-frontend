import React from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const { token } = useAuth(); // lấy token từ AuthContext

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {/* Nếu có token => đã đăng nhập => hiện Dashboard.
          Nếu chưa có token => hiện màn Login */}
      {token ? <Dashboard /> : <Login />}
    </div>
  );
};

export default App;
