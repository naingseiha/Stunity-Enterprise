/**
 * Login Screen — Clean Professional Design
 * 
 * Facebook / LinkedIn-inspired minimal layout
 * Large clean inputs, strong CTA, flat OAuth icons
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
  Image,
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

import { Colors, Typography, Spacing } from '@/config';
import { useAuthStore } from '@/stores';
import { AuthStackScreenProps } from '@/navigation/types';

type NavigationProp = AuthStackScreenProps<'Login'>['navigation'];

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login, logout, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

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
      <LinearGradient
        colors={['#F0F9FF', '#FFFFFF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            <Animated.View entering={FadeIn.delay(50).duration(400)}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={24} color={Colors.gray[800]} />
              </TouchableOpacity>
            </Animated.View>

            {/* Header */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.header}
            >
              <Image
                source={require('../../../assets/Stunity.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Sign in to Stunity</Text>
            </Animated.View>

            {/* Error */}
            {error && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            )}

            {/* Form */}
            <Animated.View entering={FadeInUp.delay(200).duration(500)}>
              {/* Email */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
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

              {/* Password */}
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  placeholderTextColor={Colors.gray[400]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.gray[400]}
                  />
                </TouchableOpacity>
              </View>

              {/* Options */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  onPress={() => setRememberMe(!rememberMe)}
                  style={styles.rememberMe}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
                style={styles.signInShadow}
              >
                <LinearGradient
                  colors={isLoading ? ['#94A3B8', '#94A3B8'] : ['#0EA5E9', '#0284C7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signInButton}
                >
                  <Text style={styles.signInText}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </Animated.View>

            {/* OAuth Buttons — flat icon-only row */}
            <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.oauthRow}>
              <TouchableOpacity
                style={styles.oauthButton}
                activeOpacity={0.7}
                onPress={() => handleSocialLogin('google')}
                disabled={socialLoading !== null}
              >
                <Ionicons name="logo-google" size={22} color="#EA4335" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.oauthButton}
                activeOpacity={0.7}
                onPress={() => handleSocialLogin('apple')}
                disabled={socialLoading !== null}
              >
                <Ionicons name="logo-apple" size={24} color="#000" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.oauthButton}
                activeOpacity={0.7}
                onPress={handleSSOLogin}
              >
                <Ionicons name="business-outline" size={22} color="#0EA5E9" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.oauthButton}
                activeOpacity={0.7}
                onPress={handleBiometricLogin}
              >
                <Ionicons name="finger-print-outline" size={22} color="#8B5CF6" />
              </TouchableOpacity>
            </Animated.View>

            {/* Dev cache clear */}
            {__DEV__ && (
              <TouchableOpacity
                onPress={async () => {
                  Alert.alert('Clear Cache & Logout', 'Clear all cached data?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await AsyncStorage.clear();
                          await logout();
                          Alert.alert('Done', 'Cache cleared.');
                        } catch (e) {
                          Alert.alert('Error', 'Failed to clear cache');
                        }
                      }
                    }
                  ]);
                }}
                style={styles.devButton}
              >
                <Ionicons name="trash-outline" size={14} color={Colors.gray[400]} />
                <Text style={styles.devText}>Clear Cache (Dev)</Text>
              </TouchableOpacity>
            )}

            <View style={{ flex: 1 }} />

            {/* Footer */}
            <Animated.View entering={FadeIn.delay(600).duration(400)}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.footer}
              >
                <Text style={styles.footerText}>
                  Don't have an account? <Text style={styles.footerLink}>Sign Up</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },

  // ── Back ──────────────────────────────────────────────
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginTop: 4,
  },

  // ── Header ────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray[900],
    letterSpacing: -0.3,
  },

  // ── Error ─────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },

  // ── Inputs ────────────────────────────────────────────
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.gray[900],
    height: '100%',
  },
  eyeButton: {
    padding: 4,
  },

  // ── Options ───────────────────────────────────────────
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  rememberText: {
    fontSize: 13,
    color: Colors.gray[600],
  },
  forgotText: {
    fontSize: 13,
    color: '#0EA5E9',
    fontWeight: '600',
  },

  // ── Sign In Button ────────────────────────────────────
  signInShadow: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    borderRadius: 26,
  },
  signInButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Divider ───────────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 13,
    color: Colors.gray[400],
    marginHorizontal: 16,
    fontWeight: '500',
  },

  // ── OAuth ─────────────────────────────────────────────
  oauthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  oauthButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // ── Dev ───────────────────────────────────────────────
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
  },
  devText: {
    fontSize: 12,
    color: Colors.gray[400],
  },

  // ── Footer ────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
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
