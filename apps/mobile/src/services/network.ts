/**
 * Network Service
 * 
 * Manages network state and automatic reconnection
 * - Listens to network state changes
 * - Queues failed requests when offline
 * - Auto-retries when network reconnects
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { eventEmitter } from '@/utils/eventEmitter';

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  data?: any;
  headers?: any;
  retry: () => Promise<any>;
  timestamp: number;
}

class NetworkService {
  private isConnected: boolean = true;
  private requestQueue: QueuedRequest[] = [];
  private listeners: Set<(connected: boolean) => void> = new Set();
  private unsubscribe?: () => void;
  private debounceTimer?: NodeJS.Timeout;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Listen to network state changes
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      this.handleNetworkChange(state);
    });

    // Check initial state
    NetInfo.fetch().then((state) => {
      this.isConnected = this.checkConnected(state);
    });
  }

  private checkConnected(state: NetInfoState): boolean {
    return state.isConnected === true && state.isInternetReachable !== false;
  }

  private handleNetworkChange(state: NetInfoState) {
    // Debounce to prevent rapid changes during WiFi switching
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const wasConnected = this.isConnected;
      const isNowConnected = this.checkConnected(state);

      if (wasConnected !== isNowConnected) {
        this.isConnected = isNowConnected;

        if (__DEV__) {
          console.log('🌐 Network status changed:', {
            from: wasConnected ? 'Online' : 'Offline',
            to: isNowConnected ? 'Online' : 'Offline',
            type: state.type,
          });
        }

        // Notify listeners
        this.notifyListeners(isNowConnected);

        // Retry queued requests when back online
        if (!wasConnected && isNowConnected) {
          this.retryQueuedRequests();
        }

        // Emit event for components
        eventEmitter.emit('network:change', { connected: isNowConnected });
      }
    }, 800); // 800ms debounce (longer for WiFi switches)
  }

  private notifyListeners(connected: boolean) {
    this.listeners.forEach((listener) => listener(connected));
  }

  private async retryQueuedRequests() {
    if (this.requestQueue.length === 0) return;

    console.log(`🔄 Retrying ${this.requestQueue.length} queued requests...`);

    // Make a copy and clear the queue
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    // Retry each request with a slight delay between them
    for (const request of queue) {
      try {
        await request.retry();
        console.log(`✅ Retried: ${request.method} ${request.url}`);
      } catch (error) {
        console.log(`❌ Retry failed: ${request.method} ${request.url}`);
        // If still failing, could re-queue, but let's not for now
      }
      
      // Small delay between retries to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Emit event that requests were retried
    eventEmitter.emit('network:retried');
  }

  // Public methods
  
  public getStatus(): boolean {
    return this.isConnected;
  }

  public addListener(listener: (connected: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public queueRequest(request: QueuedRequest): void {
    // Don't queue if already have too many (prevent memory leak)
    if (this.requestQueue.length >= 50) {
      console.warn('Request queue full, dropping oldest request');
      this.requestQueue.shift();
    }

    this.requestQueue.push(request);
    
    if (__DEV__) {
      console.log(`📥 Queued request: ${request.method} ${request.url}`);
    }
  }

  public clearQueue(): void {
    this.requestQueue = [];
  }

  public cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.listeners.clear();
    this.requestQueue = [];
  }
}

// Singleton instance
export const networkService = new NetworkService();
