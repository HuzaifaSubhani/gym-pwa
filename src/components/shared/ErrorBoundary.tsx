"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-noir-bg text-white p-6 text-center">
          <AlertTriangle className="text-red-500 mb-4" size={48} />
          <h2 className="text-2xl font-black mb-2">System Failure</h2>
          <p className="text-sm text-gray-400 mb-8 max-w-md">
            The application encountered an unexpected error. Please reload to recover your state.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-black font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity"
          >
            <RefreshCw size={20} />
            Reboot System
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
