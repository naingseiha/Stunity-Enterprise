"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function CacheClearButton() {
  const [isClearing, setIsClearing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const clearCache = async () => {
    setIsClearing(true);

    try {
      // Clear all caches
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => {
            console.log("Deleting cache:", cacheName);
            return caches.delete(cacheName);
          })
        );
      }

      // Unregister all service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => {
            console.log("Unregistering service worker");
            return registration.unregister();
          })
        );
      }

      setShowSuccess(true);

      // Reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error clearing cache:", error);
      alert("Error clearing cache. Please try refreshing the page manually.");
    } finally {
      setIsClearing(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
        ✓ Cache cleared! Reloading...
      </div>
    );
  }

  return (
    <button
      onClick={clearCache}
      disabled={isClearing}
      className="fixed bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      title="Clear app cache and reload (use if experiencing errors)"
    >
      <RefreshCw className={`w-4 h-4 ${isClearing ? "animate-spin" : ""}`} />
      {isClearing ? "Clearing..." : "Clear Cache"}
    </button>
  );
}
