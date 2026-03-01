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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import StunityLogo from '../../../assets/Stunity.svg';

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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Logo and Branding */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(700).springify()}
          style={styles.brandingContainer}
        >
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <StunityLogo width={130} height={130} style={{ marginBottom: 10 }} />
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

          {/* Other sign-in options */}
          <View style={styles.otherOptionsLabel}>
            <View style={styles.otherOptionsLine} />
            <Text style={styles.otherOptionsText}>Other sign-in options</Text>
            <View style={styles.otherOptionsLine} />
          </View>

          {/* Parent Portal */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ParentLogin')}
            activeOpacity={0.85}
            accessibilityLabel="Parent portal login"
            accessibilityRole="button"
            style={[styles.linkButton, styles.linkButtonParent]}
          >
            <View style={[styles.linkIconWrap, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="people" size={20} color="#059669" />
            </View>
            <View style={styles.linkTextWrap}>
              <Text style={styles.linkLabel}>Parent Portal</Text>
              <Text style={styles.linkDesc}>{"View your child's grades and attendance"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
          </TouchableOpacity>

          {/* Enterprise SSO */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
            accessibilityLabel="Enterprise SSO login"
            accessibilityRole="button"
            style={[styles.linkButton, styles.linkButtonEnterprise]}
          >
            <View style={[styles.linkIconWrap, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="business" size={20} color="#0EA5E9" />
            </View>
            <View style={styles.linkTextWrap}>
              <Text style={styles.linkLabel}>Enterprise SSO</Text>
              <Text style={styles.linkDesc}>Sign in with your organization</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
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
        </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Math.max(24, height * 0.05),
    paddingTop: 0,
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
    marginTop: 12,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 26,
    fontWeight: '300',
    color: Colors.gray[700],
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  taglineBrand: {
    fontWeight: '800',
    color: Colors.gray[900],
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 13,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },

  // ── Feature Highlights ────────────────────────────────
  featuresRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 1,
  },
  featureDesc: {
    fontSize: 10,
    color: Colors.gray[500],
    textAlign: 'center',
  },

  spacer: {
    flex: 1,
    minHeight: 8,
    maxHeight: 32,
  },

  // ── Buttons ───────────────────────────────────────────
  buttonsContainer: {
    marginBottom: 20,
    gap: 10,
  },
  primaryShadow: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    borderRadius: 26,
  },
  primaryButton: {
    height: 52,
    borderRadius: 26,
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
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderRadius: 26,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 26,
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
  otherOptionsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  otherOptionsLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[200],
  },
  otherOptionsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  linkButtonParent: {
    borderColor: '#A7F3D0',
  },
  linkButtonEnterprise: {
    borderColor: '#BAE6FD',
  },
  linkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTextWrap: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  linkDesc: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
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
