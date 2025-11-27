import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; 
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

console.log('Application starting...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("FATAL: Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

// Safety fallback: If React fails to replace the content within 3 seconds, show an error
const safetyTimeout = setTimeout(() => {
    if (rootElement.innerHTML.includes('Loading Application...')) {
        console.error("React render timed out.");
        rootElement.innerHTML = `
            <div style="color:white; background:#1f2937; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:20px; text-align:center;">
                <h1 style="color:#ef4444; font-size:24px; margin-bottom:10px;">Application Failed to Load</h1>
                <p>The application took too long to start. This may be due to a script error.</p>
                <button onclick="window.location.reload()" style="margin-top:20px; padding:10px 20px; background:#2563eb; color:white; border:none; border-radius:5px; cursor:pointer;">
                    Reload Page
                </button>
            </div>
        `;
    }
}, 3000);

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('React root rendered successfully');
  // Clear timeout if render call succeeds (though actual paint is async, this usually indicates no immediate crash)
  // We keep it running just in case the App component suspends indefinitely, but usually ReactDOM.render returns fast.
} catch (error) {
  clearTimeout(safetyTimeout);
  console.error('Error rendering React root:', error);
  rootElement.innerHTML = '<div style="color:red; padding: 20px;">Failed to start application. Check console for details.</div>';
}