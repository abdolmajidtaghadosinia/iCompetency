import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
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

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4" dir="ltr">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-200 max-w-3xl w-full overflow-hidden">
            <div className="bg-red-600 p-6 text-white flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full">
                    <AlertTriangle size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Application Crashed</h1>
                    <p className="text-red-100">Something went wrong in the rendering process.</p>
                </div>
            </div>
            
            <div className="p-8">
                <div className="mb-6">
                    <h3 className="font-bold text-gray-800 mb-2">Error Message:</h3>
                    <div className="bg-red-100 text-red-900 p-4 rounded-lg font-mono text-sm border border-red-200 break-words">
                        {this.state.error?.toString()}
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="font-bold text-gray-800 mb-2">Component Stack:</h3>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-64 border border-gray-700">
                        {this.state.errorInfo?.componentStack || "No stack trace available."}
                    </div>
                </div>

                <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
                >
                    <RefreshCw size={20} />
                    Reload Application
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;