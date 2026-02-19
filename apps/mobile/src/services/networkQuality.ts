/**
 * Network Quality Service
 * 
 * Detects network connection quality and provides adaptive loading strategies
 * for optimal performance on 2G, 3G, 4G, 5G, and WiFi
 */

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

export type NetworkQuality = 'excellent' | 'good' | 'poor' | 'offline';

interface NetworkConfig {
  quality: NetworkQuality;
  connectionType: NetInfoStateType;
  isConnected: boolean;
  // Adaptive loading configs
  batchSize: number;        // Posts to fetch per page
  imageCacheDays: number;   // How long to cache images
  prefetchEnabled: boolean; // Whether to prefetch next page
  videoAutoplay: boolean;   // Whether to autoplay videos
  imageQuality: 'high' | 'medium' | 'low';
}

class NetworkQualityService {
  private currentConfig: NetworkConfig = this.getDefaultConfig();
  private listeners: ((config: NetworkConfig) => void)[] = [];

  constructor() {
    this.initialize();
  }

  private getDefaultConfig(): NetworkConfig {
    return {
      quality: 'good',
      connectionType: NetInfoStateType.wifi,
      isConnected: true,
      batchSize: 20,
      imageCacheDays: 7,
      prefetchEnabled: true,
      videoAutoplay: true,
      imageQuality: 'high',
    };
  }

  private initialize() {
    // Listen to network state changes
    NetInfo.addEventListener((state: NetInfoState) => {
      this.handleNetworkChange(state);
    });

    // Get initial state
    NetInfo.fetch().then((state) => {
      this.handleNetworkChange(state);
    });
  }

  private handleNetworkChange(state: NetInfoState) {
    const quality = this.determineQuality(state);
    const config = this.generateConfig(state, quality);
    
    this.currentConfig = config;
    this.notifyListeners(config);

    // Log for debugging
    console.log('📶 [Network] Quality:', quality, '| Type:', state.type, '| Config:', {
      batchSize: config.batchSize,
      imageQuality: config.imageQuality,
      prefetch: config.prefetchEnabled,
    });
  }

  private determineQuality(state: NetInfoState): NetworkQuality {
    if (!state.isConnected) {
      return 'offline';
    }

    const { type, details } = state;

    // WiFi or Ethernet = Excellent (unless throttled)
    if (type === 'wifi' || type === 'ethernet') {
      // Check if WiFi is fast
      const effectiveType = (details as any)?.effectiveConnectionType;
      if (effectiveType === '2g') return 'poor';
      if (effectiveType === '3g') return 'good';
      return 'excellent';
    }

    // Cellular - determine by generation
    if (type === 'cellular') {
      const generation = (details as any)?.cellularGeneration;
      
      if (generation === '5g') return 'excellent';
      if (generation === '4g') return 'good';
      if (generation === '3g') return 'good';
      if (generation === '2g') return 'poor';
      
      // Unknown cellular generation - assume 4G
      return 'good';
    }

    // Other types (bluetooth, wimax, etc) - assume good
    if (type === 'other' || type === 'unknown') {
      return 'good';
    }

    return 'good';
  }

  private generateConfig(state: NetInfoState, quality: NetworkQuality): NetworkConfig {
    const base: NetworkConfig = {
      quality,
      connectionType: state.type,
      isConnected: state.isConnected ?? false,
      batchSize: 20,
      imageCacheDays: 7,
      prefetchEnabled: true,
      videoAutoplay: true,
      imageQuality: 'high',
    };

    // Adaptive configuration based on quality
    switch (quality) {
      case 'excellent': // WiFi 4G+ / 5G
        return {
          ...base,
          batchSize: 20,           // Full batch
          imageCacheDays: 7,       // Cache for 7 days
          prefetchEnabled: true,   // Prefetch next page
          videoAutoplay: true,     // Autoplay videos
          imageQuality: 'high',    // Full quality images
        };

      case 'good': // 3G / 4G
        return {
          ...base,
          batchSize: 15,           // Slightly smaller batch
          imageCacheDays: 7,       // Still cache for 7 days
          prefetchEnabled: true,   // Prefetch enabled
          videoAutoplay: false,    // Don't autoplay videos
          imageQuality: 'high',    // Full quality (cached anyway)
        };

      case 'poor': // 2G / Slow WiFi
        return {
          ...base,
          batchSize: 10,           // Small batch
          imageCacheDays: 3,       // Shorter cache (save space)
          prefetchEnabled: false,  // No prefetch
          videoAutoplay: false,    // No autoplay
          imageQuality: 'medium',  // Compressed images
        };

      case 'offline':
        return {
          ...base,
          batchSize: 0,            // No fetching
          imageCacheDays: 7,       // Keep cache
          prefetchEnabled: false,  // No prefetch
          videoAutoplay: false,    // No autoplay
          imageQuality: 'low',     // Show cached only
        };

      default:
        return base;
    }
  }

  // Public API
  public getConfig(): NetworkConfig {
    return this.currentConfig;
  }

  public getQuality(): NetworkQuality {
    return this.currentConfig.quality;
  }

  public isGoodConnection(): boolean {
    return this.currentConfig.quality === 'excellent' || this.currentConfig.quality === 'good';
  }

  public shouldPrefetch(): boolean {
    return this.currentConfig.prefetchEnabled && this.currentConfig.isConnected;
  }

  public shouldAutoplayVideo(): boolean {
    return this.currentConfig.videoAutoplay && this.currentConfig.isConnected;
  }

  public getBatchSize(): number {
    return this.currentConfig.batchSize;
  }

  public subscribe(listener: (config: NetworkConfig) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(config: NetworkConfig) {
    this.listeners.forEach(listener => listener(config));
  }

  // Force refresh network state (useful for manual retry)
  public async refresh(): Promise<NetworkConfig> {
    const state = await NetInfo.fetch();
    this.handleNetworkChange(state);
    return this.currentConfig;
  }
}

// Singleton instance
export const networkQualityService = new NetworkQualityService();
