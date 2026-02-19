/**
 * Login Screen — Premium Enterprise Design
 * 
 * Glassmorphism card, decorative blobs, enhanced inputs
 * Matches the premium sky-blue design language
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
} from 'react-native-reanimated';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button, Input } from '@/components/common';
import { Colors, Typography, Spacing } from '@/config';
import { useAuthStore } from '@/stores';
import { AuthStackScreenProps } from '@/navigation/types';

type NavigationProp = AuthStackScreenProps<'Login'>['navigation'];

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login, logout, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const organizationRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    clearError();
    const success = await login({
      email: email.trim(),
      password,
      rememberMe,
    });

    if (!success && error) {
      Alert.alert('Login Failed', error);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometric Not Available', 'Please use your email and password to login.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to Stunity',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        Alert.alert('Success', 'Biometric authentication successful!');
      }
    } catch (error) {
      console.error('Biometric error:', error);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert('Coming Soon', `${provider === 'google' ? 'Google' : 'Apple'} authentication will be available soon.`);
    } finally {
      setSocialLoading(null);
    }
  };

  const handleSSOLogin = () => {
    Alert.alert('Enterprise SSO', 'Please contact your organization administrator for SSO access.');
  };

  return (
    <View style={styles.container}>
      {/* Premium Background */}
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Decorative Blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={22} color={Colors.gray[700]} />
              </TouchableOpacity>
            </Animated.View>

            {/* Header */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(600).springify()}
              style={styles.headerContainer}
            >
              <View style={styles.headerIcon}>
                <LinearGradient
                  colors={['#0EA5E9', '#0284C7']}
                  style={styles.headerIconGradient}
                >
                  <Ionicons name="lock-open-outline" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to your learning journey
              </Text>
            </Animated.View>

            {/* Glass Card */}
            <Animated.View
              entering={FadeInUp.delay(300).duration(600)}
              style={styles.formSection}
            >
              {error && (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={styles.errorContainer}
                >
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              {/* Organization Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Organization <Text style={styles.optionalLabel}>(Optional)</Text>
                </Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="business" size={18} color="#0EA5E9" />
                  </View>
                  <TextInput
                    ref={organizationRef}
                    style={styles.input}
                    placeholder="Institution or organization code"
                    value={organization}
                    onChangeText={setOrganization}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    placeholderTextColor={Colors.gray[400]}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="mail" size={18} color="#0EA5E9" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="your.email@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    placeholderTextColor={Colors.gray[400]}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <View style={styles.inputIconWrap}>
                    <Ionicons name="lock-closed" size={18} color="#0EA5E9" />
                  </View>
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    placeholderTextColor={Colors.gray[400]}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={18}
                      color={Colors.gray[400]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  onPress={() => setRememberMe(!rememberMe)}
                  style={styles.rememberMe}
                  activeOpacity={0.7}
                >
                  <View style={[styles.toggle, rememberMe && styles.toggleActive]}>
                    <View style={[styles.toggleKnob, rememberMe && styles.toggleKnobActive]} />
                  </View>
                  <Text style={styles.rememberText}>Remember Me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
                style={styles.loginShadow}
              >
                <LinearGradient
                  colors={isLoading ? ['#9CA3AF', '#6B7280'] : ['#0EA5E9', '#0284C7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}
                >
                  {isLoading ? (
                    <Text style={styles.loginButtonText}>Signing In...</Text>
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <Animated.View entering={FadeIn.delay(500).duration(400)} style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            {/* Social Login Row */}
            <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.8}
                onPress={() => handleSocialLogin('google')}
                disabled={socialLoading !== null}
              >
                <Ionicons name="logo-google" size={22} color="#EA4335" />
                <Text style={styles.socialLabel}>
                  {socialLoading === 'google' ? '...' : 'Google'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.8}
                onPress={() => handleSocialLogin('apple')}
                disabled={socialLoading !== null}
              >
                <Ionicons name="logo-apple" size={22} color="#000" />
                <Text style={styles.socialLabel}>
                  {socialLoading === 'apple' ? '...' : 'Apple'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.8}
                onPress={handleSSOLogin}
              >
                <Ionicons name="business" size={20} color="#0EA5E9" />
                <Text style={styles.socialLabel}>SSO</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.8}
                onPress={handleBiometricLogin}
              >
                <Ionicons name="finger-print" size={22} color="#8B5CF6" />
                <Text style={styles.socialLabel}>Bio</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Clear Cache Button - Dev Only */}
            {__DEV__ && (
              <TouchableOpacity
                onPress={async () => {
                  Alert.alert(
                    'Clear Cache & Logout',
                    'This will log you out and clear all cached data.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear Cache',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await AsyncStorage.clear();
                            await logout();
                            Alert.alert('Success', 'Cache cleared! Please login again.');
                          } catch (error) {
                            Alert.alert('Error', 'Failed to clear cache');
                          }
                        }
                      }
                    ]
                  );
                }}
                style={styles.clearCacheButton}
              >
                <Ionicons name="trash-outline" size={14} color={Colors.gray[500]} />
                <Text style={styles.clearCacheText}>Clear Cache (Dev)</Text>
              </TouchableOpacity>
            )}

            {/* Footer */}
            <Animated.View entering={FadeIn.delay(700).duration(400)}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.footer}
              >
                <Text style={styles.footerText}>
                  Don't have an account? <Text style={styles.footerLink}>Create Account</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },

  // ── Decorative Blobs ──────────────────────────────────
  blob1: {
    position: 'absolute', top: -50, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(14,165,233,0.08)',
  },
  blob2: {
    position: 'absolute', top: 180, left: -70,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(139,92,246,0.05)',
  },
  blob3: {
    position: 'absolute', bottom: 100, right: -50,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(14,165,233,0.04)',
  },

  // ── Back Button ───────────────────────────────────────
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },

  // ── Header ────────────────────────────────────────────
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    marginBottom: 16,
  },
  headerIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.gray[900],
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
  },

  // ── Glass Card ────────────────────────────────────────
  formSection: {
    marginBottom: 4,
  },

  // ── Inputs ────────────────────────────────────────────
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: Colors.gray[700],
    marginBottom: 8,
    fontWeight: '600',
  },
  optionalLabel: {
    color: Colors.gray[400],
    fontWeight: '400',
    fontSize: 11,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 26,
    paddingHorizontal: 12,
    height: 52,
  },
  inputIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.gray[900],
  },
  eyeBtn: {
    padding: 6,
  },

  // ── Options Row ───────────────────────────────────────
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.gray[300],
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginRight: 8,
  },
  toggleActive: {
    backgroundColor: '#0EA5E9',
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  rememberText: {
    fontSize: 13,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    color: '#0EA5E9',
    fontWeight: '600',
  },

  // ── Login Button ──────────────────────────────────────
  loginShadow: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    borderRadius: 26,
  },
  loginButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // ── Error ─────────────────────────────────────────────
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    padding: 12,
    borderRadius: 26,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },

  // ── Divider ───────────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[200],
  },
  dividerText: {
    fontSize: 12,
    color: Colors.gray[400],
    marginHorizontal: 12,
    fontWeight: '500',
  },

  // ── Social Login ──────────────────────────────────────
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBtn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 4,
  },
  socialLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray[600],
  },

  // ── Clear Cache ───────────────────────────────────────
  clearCacheButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  clearCacheText: {
    fontSize: 12,
    color: Colors.gray[500],
    fontWeight: '500',
  },

  // ── Footer ────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  footerLink: {
    color: '#0EA5E9',
    fontWeight: '700',
  },
});
