import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = window.location.origin + window.location.pathname;
  };

  private handleReturnHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-[#0a0d14] text-slate-100 p-6">
          <div className="max-w-lg w-full bg-[#111622] border border-red-500/30 rounded-xl p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center space-x-3 text-red-400 mb-4">
              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertTriangle size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Workspace Initialization Issue</h2>
                <p className="text-xs text-slate-400">BeamLab encountered a layout or runtime issue.</p>
              </div>
            </div>

            <div className="my-4 p-3.5 bg-black/50 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 max-h-32 overflow-y-auto break-words">
              {this.state.error?.message || 'Unknown runtime error'}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
              >
                <RefreshCw size={14} />
                Reload Page
              </button>
              <button
                onClick={this.handleResetCache}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              >
                <Trash2 size={14} />
                Clear Cache & Reload
              </button>
              <button
                onClick={this.handleReturnHome}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              >
                <Home size={14} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
