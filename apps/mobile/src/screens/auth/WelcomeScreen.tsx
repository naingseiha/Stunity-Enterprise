/**
 * Welcome Screen — Premium Enterprise Design
 * 
 * Animated floating circles, feature highlights, glassmorphism buttons
 * Matches the premium sky-blue design language of Feed/Profile/Course
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing } from '@/config';
import { AuthStackScreenProps } from '@/navigation/types';

const { width, height } = Dimensions.get('window');

type NavigationProp = AuthStackScreenProps<'Welcome'>['navigation'];

const FEATURES = [
  { icon: 'school' as const, color: '#0EA5E9', bg: '#E0F2FE', label: 'Learn', desc: 'Courses & Quizzes' },
  { icon: 'people' as const, color: '#8B5CF6', bg: '#F3E8FF', label: 'Connect', desc: 'Social Learning' },
  { icon: 'trophy' as const, color: '#F59E0B', bg: '#FEF3C7', label: 'Achieve', desc: 'Track Progress' },
];

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Premium Gradient Background */}
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Decorative Floating Circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />
      <View style={styles.decorCircle4} />

      <SafeAreaView style={styles.content}>
        {/* Logo and Branding */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(700).springify()}
          style={styles.brandingContainer}
        >
          <Animated.View entering={ZoomIn.delay(100).duration(600)} style={styles.logoGlow}>
            <Image
              source={require('../../../assets/Stunity.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Text style={styles.tagline}>
            Welcome to{'\n'}
            <Text style={styles.taglineBrand}>Stunity</Text>
          </Text>

          <Text style={styles.description}>
            Enterprise Social Learning Platform {'\n'}for Educational Excellence
          </Text>
        </Animated.View>

        {/* Feature Highlights */}
        <Animated.View
          entering={FadeIn.delay(500).duration(600)}
          style={styles.featuresRow}
        >
          {FEATURES.map((f, i) => (
            <Animated.View
              key={f.label}
              entering={FadeInDown.delay(600 + i * 120).duration(500).springify()}
              style={styles.featureCard}
            >
              <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        <View style={styles.spacer} />

        {/* Buttons */}
        <Animated.View
          entering={FadeInUp.delay(900).duration(600)}
          style={styles.buttonsContainer}
        >
          {/* Create Account — Primary CTA */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.85}
            accessibilityLabel="Create new account"
            accessibilityRole="button"
            style={styles.primaryShadow}
          >
            <LinearGradient
              colors={['#0EA5E9', '#0284C7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Ionicons name="person-add-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Sign In — Secondary */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
            accessibilityLabel="Sign in with existing account"
            accessibilityRole="button"
            style={styles.secondaryShadow}
          >
            <View style={styles.secondaryButton}>
              <Ionicons name="log-in-outline" size={20} color="#0284C7" style={{ marginRight: 8 }} />
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </View>
          </TouchableOpacity>

          {/* Enterprise SSO */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
            accessibilityLabel="Enterprise SSO login"
            accessibilityRole="button"
            style={styles.ssoButton}
          >
            <View style={styles.ssoIconWrap}>
              <Ionicons name="business" size={16} color="#0EA5E9" />
            </View>
            <Text style={styles.ssoText}>Enterprise SSO</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.gray[400]} />
          </TouchableOpacity>

          {/* Trust Footer */}
          <View style={styles.footer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Ionicons name="shield-checkmark" size={14} color={Colors.gray[400]} />
              <View style={styles.dividerLine} />
            </View>
            <Text style={styles.footerText}>
              Trusted by educational institutions worldwide
            </Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // ── Decorative Circles ────────────────────────────────
  decorCircle1: {
    position: 'absolute', top: -40, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(14,165,233,0.08)',
  },
  decorCircle2: {
    position: 'absolute', top: height * 0.25, left: -60,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(139,92,246,0.06)',
  },
  decorCircle3: {
    position: 'absolute', bottom: height * 0.18, right: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(14,165,233,0.05)',
  },
  decorCircle4: {
    position: 'absolute', bottom: -30, left: 30,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(245,158,11,0.06)',
  },

  // ── Branding ──────────────────────────────────────────
  brandingContainer: {
    alignItems: 'center',
    marginTop: height * 0.04,
  },
  logoGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  tagline: {
    fontSize: 30,
    fontWeight: '300',
    color: Colors.gray[700],
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  taglineBrand: {
    fontWeight: '800',
    color: Colors.gray[900],
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },

  // ── Feature Highlights ────────────────────────────────
  featuresRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 10,
    color: Colors.gray[500],
    textAlign: 'center',
  },

  spacer: {
    flex: 1,
    minHeight: 20,
  },

  // ── Buttons ───────────────────────────────────────────
  buttonsContainer: {
    marginBottom: 16,
    gap: 12,
  },
  primaryShadow: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    borderRadius: 28,
  },
  primaryButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  secondaryShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderRadius: 28,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#BAE6FD',
  },
  secondaryButtonText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  ssoButton: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    flexDirection: 'row',
    gap: 8,
  },
  ssoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ssoText: {
    color: Colors.gray[600],
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
  },

  // ── Footer ────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    marginTop: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dividerLine: {
    width: 36,
    height: 1,
    backgroundColor: Colors.gray[300],
  },
  footerText: {
    fontSize: 11,
    color: Colors.gray[500],
    fontWeight: '500',
  },
});
