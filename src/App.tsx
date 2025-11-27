
import React, { Suspense } from 'react';
import { useAuth } from './hooks/useAuth';

// Lazy load components to prevent module loading errors from crashing the main entry point
// and to break potential circular dependencies.
const Login = React.lazy(() => import('./components/Login'));
const Dashboard = React.lazy(() => import('./components/Dashboard'));

const GlobalLoading = () => (
  <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
    <p className="text-sm text-gray-300">Loading modules...</p>
  </div>
);

function App() {
  const { token, loading } = useAuth();

  console.log("App Render: Auth Loading =", loading, ", Token present =", !!token);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-sm text-gray-300">Initializing Authentication...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans" id="app-container">
      <Suspense fallback={<GlobalLoading />}>
        {token ? <Dashboard /> : <Login />}
      </Suspense>
    </div>
  );
}

export default App;
