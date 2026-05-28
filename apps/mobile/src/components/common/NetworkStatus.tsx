/**
 * NetworkStatus Component
 *
 * Enterprise-grade online/offline toast — inspired by Facebook, Instagram & LinkedIn.
 * Design principles:
 *  - Compact pill (not a full-width bar) — floats below the header
 *  - Offline: dark charcoal pill with wifi-off icon, stays visible
 *  - Back online: brief green pill toast that auto-dismisses after 2 s
 *  - Smooth spring slide-in + opacity fade
 *  - No Reanimated dependency — uses built-in Animated API
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';

interface NetworkStatusProps {
  onRetry?: () => void;
}

// How long the "Back online" pill stays visible before hiding (ms)
const ONLINE_TOAST_DURATION = 2500;
// Debounce rapid network state flips (ms)
const DEBOUNCE_MS = 600;

export default function NetworkStatus({ onRetry }: NetworkStatusProps) {
  const { t } = useTranslation();

  const [isConnected, setIsConnected] = useState(true);
  const [visible, setVisible] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Animated values
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Animation helpers ────────────────────────────────────────────────────────

  const animateIn = () => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 260,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 18,
        stiffness: 260,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = (onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onDone?.();
    });
  };

  // ── Network listener ─────────────────────────────────────────────────────────

  useEffect(() => {
    const applyState = (connected: boolean) => {
      setIsConnected(connected);

      // Clear any pending dismiss timer
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }

      if (!connected) {
        // Show offline pill — keep visible until reconnected
        animateIn();
      } else if (hasInitialized) {
        // Show "Back online" pill, then auto-dismiss
        animateIn();
        dismissTimerRef.current = setTimeout(() => {
          animateOut();
        }, ONLINE_TOAST_DURATION);
      }
    };

    // Initial fetch
    NetInfo.fetch().then(state => {
      const connected =
        (state.isConnected ?? false) && state.isInternetReachable !== false;
      setIsConnected(connected);
      setHasInitialized(true);
      if (!connected) {
        setVisible(true);
        // Reset to visible position immediately for initial offline state
        translateY.setValue(0);
        opacity.setValue(1);
        scale.setValue(1);
      }
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const connected =
          (state.isConnected ?? false) && state.isInternetReachable !== false;
        applyState(connected);
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized]);

  // ── Retry handler ────────────────────────────────────────────────────────────

  const handleRetry = () => {
    NetInfo.fetch().then(state => {
      const connected =
        (state.isConnected ?? false) && state.isInternetReachable !== false;
      if (connected && onRetry) onRetry();
    });
  };

  if (!visible) return null;

  // Position the pill below the safe area top (header sits below insets on SafeAreaView screens)
  // We render inside the screen body (after SafeAreaView), so we add a small offset from the top.
  const topOffset = Platform.OS === 'android' ? 12 : 10;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: topOffset },
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.pill,
          isConnected ? styles.pillOnline : styles.pillOffline,
        ]}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, isConnected ? styles.iconWrapOnline : styles.iconWrapOffline]}>
          <Ionicons
            name={isConnected ? 'wifi' : 'wifi-outline'}
            size={14}
            color={isConnected ? '#FFFFFF' : '#F87171'}
          />
        </View>

        {/* Label */}
        <Text
          style={[styles.label, isConnected ? styles.labelOnline : styles.labelOffline]}
          numberOfLines={1}
        >
          {isConnected
            ? t('common.network.online')
            : t('common.network.offline')}
        </Text>

        {/* Retry button — only when offline and onRetry provided */}
        {!isConnected && onRetry && (
          <TouchableOpacity
            onPress={handleRetry}
            style={styles.retryBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.retryText}>{t('common.network.retry')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Absolutely positioned wrapper — centers the pill horizontally
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    // Allow touches to pass through the transparent wrapper area
    pointerEvents: 'box-none',
  },

  // The pill itself
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 100,
    gap: 8,
    maxWidth: 300,
    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // ── Offline state ────────────────────────────────────────────────────────────
  pillOffline: {
    backgroundColor: '#1A1A1A', // Very dark, almost black — like FB/IG
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrapOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  labelOffline: {
    color: '#F1F1F1',
  },

  // ── Online state ─────────────────────────────────────────────────────────────
  pillOnline: {
    backgroundColor: '#14532D', // Deep green
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.2)',
  },
  iconWrapOnline: {
    backgroundColor: 'rgba(74, 222, 128, 0.25)',
  },
  labelOnline: {
    color: '#DCFCE7',
  },

  // ── Shared icon container ────────────────────────────────────────────────────
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Text ─────────────────────────────────────────────────────────────────────
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    flexShrink: 1,
  },

  // ── Retry button ──────────────────────────────────────────────────────────────
  retryBtn: {
    marginLeft: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
