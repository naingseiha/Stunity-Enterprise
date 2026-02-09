/**
 * NetworkStatus Component
 * 
 * Shows online/offline status banner like web version
 * - Smooth slide in/out animations
 * - Auto-hide when online
 * - Retry button when offline
 * - Debounced to prevent rapid changes during WiFi switching
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';

interface NetworkStatusProps {
  onRetry?: () => void;
}

export default function NetworkStatus({ onRetry }: NetworkStatusProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const translateY = useSharedValue(-100);
  const [hasInitialized, setHasInitialized] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      // Debounce network state changes to prevent rapid updates during WiFi switching
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const connected = state.isConnected && state.isInternetReachable !== false;
        
        // Only log if there's an actual change or issue
        if (!connected || (connected && !isConnected && hasInitialized)) {
          console.log('Network Status Changed:', {
            status: connected ? 'Online' : 'Offline',
            type: state.type,
          });
        }

        const wasConnected = isConnected;
        setIsConnected(connected);

        if (!connected) {
          // Show offline banner immediately
          setShowBanner(true);
          translateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
        } else if (!wasConnected && connected && hasInitialized) {
          // Only show "back online" message if we were previously offline
          setShowBanner(true);
          translateY.value = withSpring(0);
          // Hide banner after 2 seconds when back online
          setTimeout(() => {
            translateY.value = withTiming(-100, { duration: 300 });
            setTimeout(() => setShowBanner(false), 300);
          }, 2000);
        }
      }, 500); // 500ms debounce delay
    });

    // Initial check
    NetInfo.fetch().then(state => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);
      setHasInitialized(true);
      
      if (!connected) {
        console.log('Initial network status: Offline');
        setShowBanner(true);
        translateY.value = withSpring(0);
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []); // Remove showBanner dependency to prevent re-subscriptions

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleRetry = () => {
    // Trigger a network check
    NetInfo.fetch().then(state => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      if (connected && onRetry) {
        onRetry();
      }
    });
  };

  if (!showBanner) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        isConnected ? styles.containerOnline : styles.containerOffline,
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={isConnected ? 'cloud-done' : 'cloud-offline'}
          size={20}
          color="#fff"
        />
        <Text style={styles.text}>
          {isConnected 
            ? 'Back online! 🎉' 
            : 'No internet connection'}
        </Text>
        {!isConnected && onRetry && (
          <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  containerOffline: {
    backgroundColor: '#EF4444',
  },
  containerOnline: {
    backgroundColor: '#10B981',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  retryButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
