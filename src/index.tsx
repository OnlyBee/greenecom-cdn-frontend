
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

// Safety fallback: Checks if the app is still showing the initial HTML OR if it rendered an empty black screen
const safetyTimeout = setTimeout(() => {
    // Check if initial loading text is still there
    const stillInitial = rootElement.innerHTML.includes('Loading Application...');
    
    // Check if the app rendered but is empty (e.g., just the background div with no content)
    // We look for 'app-container' which we added in App.tsx, and check its content text
    const appContainer = document.getElementById('app-container');
    const isEmptyRender = appContainer && appContainer.innerText.trim().length === 0;

    if (stillInitial || isEmptyRender) {
        console.error("React render timed out or resulted in empty output.");
        rootElement.innerHTML = `
            <div style="color:white; background:#1f2937; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:20px; text-align:center;">
                <h1 style="color:#ef4444; font-size:24px; margin-bottom:10px;">Application Failed to Render</h1>
                <p>The application loaded but failed to display the interface.</p>
                <p style="font-size:12px; color:#9ca3af; margin-top:5px;">Check the console (F12) for detailed errors.</p>
                <button onclick="localStorage.clear(); window.location.reload()" style="margin-top:20px; padding:10px 20px; background:#2563eb; color:white; border:none; border-radius:5px; cursor:pointer;">
                    Clear Cache & Reload
                </button>
            </div>
        `;
    }
}, 4000); // Increased timeout slightly for lazy loading

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
  console.log('React root render initiated');
} catch (error) {
  clearTimeout(safetyTimeout);
  console.error('Error rendering React root:', error);
  rootElement.innerHTML = '<div style="color:red; padding: 20px;">Failed to start application. Check console for details.</div>';
}
