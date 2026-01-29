"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-black text-gray-900 text-center mb-2">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 text-center mb-6">
              We apologize for the inconvenience. An error occurred while
              loading this page.
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                <h3 className="font-bold text-gray-900 mb-2">Error Details:</h3>
                <pre className="text-xs text-red-600 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-gray-600 mt-2 overflow-x-auto whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                <RefreshCcw className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                <Home className="w-5 h-5" />
                Go to Dashboard
              </button>
            </div>

            {/* Support Message */}
            <p className="text-sm text-gray-500 text-center mt-6">
              If this problem persists, please contact technical support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Smaller error boundary for inline use
export const InlineErrorBoundary: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-semibold">
                Failed to load this section
              </span>
            </div>
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
};
