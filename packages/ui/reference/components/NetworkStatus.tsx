"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface NetworkStatusProps {
  className?: string;
}

export function NetworkStatus({ className = "" }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [maxRetries, setMaxRetries] = useState(3);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Initial check
    setIsOnline(navigator.onLine);

    // Handle online/offline events
    const handleOnline = () => {
      console.log("🌐 Network: Back online");
      setIsOnline(true);
      setShowStatus(true);
      // Hide after 3 seconds
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleOffline = () => {
      console.log("📵 Network: Offline");
      setIsOnline(false);
      setShowStatus(true);
    };

    // Handle retry events from API client
    const handleRetry = (event: any) => {
      const { attempt, maxRetries: max } = event.detail;
      setIsRetrying(true);
      setRetryAttempt(attempt);
      setMaxRetries(max);
      setShowStatus(true);

      // Hide after successful retry (assuming success if we stop getting events)
      setTimeout(() => {
        setIsRetrying(false);
        setShowStatus(false);
      }, 5000);
    };

    // Custom network events from API client
    const handleNetworkOnline = () => {
      setIsOnline(true);
      setShowStatus(true);
      setTimeout(() => setShowStatus(false), 3000);
    };

    const handleNetworkOffline = () => {
      setIsOnline(false);
      setShowStatus(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("api-retry", handleRetry);
    window.addEventListener("network-online", handleNetworkOnline);
    window.addEventListener("network-offline", handleNetworkOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("api-retry", handleRetry);
      window.removeEventListener("network-online", handleNetworkOnline);
      window.removeEventListener("network-offline", handleNetworkOffline);
    };
  }, []);

  // Don't show if online and not retrying
  if (!showStatus && isOnline && !isRetrying) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
        showStatus ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      } ${className}`}
    >
      {/* Offline Status */}
      {!isOnline && (
        <div className="bg-red-500/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-lg border border-red-400/50 flex items-center gap-3 animate-in slide-in-from-top">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <p className="font-khmer-body text-sm font-bold">
              គ្មានអ៊ីនធឺណិត
            </p>
            <p className="font-khmer-body text-xs opacity-90">
              No Internet Connection
            </p>
          </div>
        </div>
      )}

      {/* Back Online Status */}
      {isOnline && !isRetrying && showStatus && (
        <div className="bg-green-500/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-lg border border-green-400/50 flex items-center gap-3 animate-in slide-in-from-top">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <p className="font-khmer-body text-sm font-bold">
              បានតភ្ជាប់ឡើងវិញ
            </p>
            <p className="font-khmer-body text-xs opacity-90">
              Connection Restored
            </p>
          </div>
        </div>
      )}

      {/* Retry Status */}
      {isRetrying && (
        <div className="bg-blue-500/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-lg border border-blue-400/50 flex items-center gap-3 animate-in slide-in-from-top">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <p className="font-khmer-body text-sm font-bold">
              កំពុងព្យាយាមម្តងទៀត
            </p>
            <p className="font-khmer-body text-xs opacity-90">
              Retrying ({retryAttempt}/{maxRetries})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
