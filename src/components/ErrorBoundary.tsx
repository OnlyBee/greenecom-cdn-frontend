
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Something went wrong</h1>
          <p className="text-gray-300 mb-4">The application crashed. Please try refreshing the page.</p>
          {this.state.error && (
            <div className="bg-gray-800 p-4 rounded border border-red-900 max-w-2xl overflow-auto w-full">
              <p className="font-mono text-red-300 text-sm mb-2">{this.state.error.toString()}</p>
              {this.state.errorInfo && (
                <pre className="font-mono text-gray-400 text-xs whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
          <button 
            onClick={() => {
                localStorage.clear();
                window.location.reload();
            }}
            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
          >
            Clear Cache & Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
