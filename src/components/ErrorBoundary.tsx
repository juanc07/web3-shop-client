// src/components/ErrorBoundary.tsx
import React, { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full px-4 py-6 text-center">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Something went wrong.</h2>
          <p className="mt-2 text-muted-foreground">
            {this.state.error?.message || "An unexpected error occurred."}
          </p>
          <button
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.state.hasError ? null : this.props.children;
  }
}

export default ErrorBoundary;