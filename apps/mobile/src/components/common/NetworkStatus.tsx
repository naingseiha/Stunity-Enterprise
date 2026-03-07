/**
 * NetworkStatus Component
 *
 * Shows online/offline status banner - uses built-in Animated API (no Reanimated)
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';

interface NetworkStatusProps {
  onRetry?: () => void;
}

export default function NetworkStatus({ onRetry }: NetworkStatusProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const [hasInitialized, setHasInitialized] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const slideIn = () => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 15,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  };

  const slideOut = (onDone?: () => void) => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(onDone);
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const connected = (state.isConnected ?? false) && state.isInternetReachable !== false;

        setIsConnected(connected);

        if (!connected) {
          setShowBanner(true);
          slideIn();
        } else if (hasInitialized) {
          setShowBanner(true);
          slideIn();
          setTimeout(() => {
            slideOut(() => setShowBanner(false));
          }, 2000);
        }
      }, 500);
    });

    NetInfo.fetch().then(state => {
      const connected = (state.isConnected ?? false) && state.isInternetReachable !== false;
      setIsConnected(connected);
      setHasInitialized(true);

      if (!connected) {
        setShowBanner(true);
        slideIn();
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleRetry = () => {
    NetInfo.fetch().then(state => {
      const connected = (state.isConnected ?? false) && state.isInternetReachable !== false;
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
        { transform: [{ translateY }] },
      ]}
    >
      <View style={styles.content}>
        <Ionicons
          name={isConnected ? 'cloud-done' : 'cloud-offline'}
          size={20}
          color="#fff"
        />
        <Text style={styles.text}>
          {isConnected ? 'Back online! 🎉' : 'No internet connection'}
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
