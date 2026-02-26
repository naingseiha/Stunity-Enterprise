/**
 * AILoadingOverlay
 * 
 * An animated loading overlay shown while the AI is generating content.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface AILoadingOverlayProps {
    isVisible: boolean;
    message?: string;
}

export function AILoadingOverlay({ isVisible, message = 'AI is writing...' }: AILoadingOverlayProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isVisible) {
            // Pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Rotation animation for sparkles
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            pulseAnim.setValue(1);
            rotateAnim.setValue(0);
        }
    }, [isVisible]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    if (!isVisible) return null;

    return (
        <View style={styles.overlay}>
            <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.iconWrap}>
                    <LinearGradient
                        colors={['#8B5CF6', '#3B82F6']}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="sparkles" size={32} color="#FFFFFF" />
                    </Animated.View>
                </View>
                <Text style={styles.message}>{message}</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        padding: 30,
        borderRadius: 24,
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: 16,
    },
    message: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4C1D95',
        letterSpacing: -0.3,
    },
});
