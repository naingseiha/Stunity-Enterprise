/**
 * Login Screen
 * 
 * Soft, modern design matching reference style
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
  const { login, logout, isLoading, error, clearError} = useAuthStore();
  
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
      // TODO: Implement social auth
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
      {/* Light Yellow to White Gradient Background */}
      <LinearGradient
        colors={['#E0F2FE', '#FFFFFF']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
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
                <Ionicons name="arrow-back" size={22} color={Colors.gray[700]} />
              </TouchableOpacity>
            </Animated.View>

            {/* Content */}
            <Animated.View 
              entering={FadeInUp.delay(200).duration(500)}
              style={styles.content}
            >
              <View style={styles.headerContainer}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>
                  Sign in to access your educational social learning platform
                </Text>
              </View>

              {error && (
                <Animated.View 
                  entering={FadeInDown.duration(300)}
                  style={styles.errorContainer}
                >
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              {/* Organization Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <Ionicons name="business" size={14} color={Colors.gray[600]} /> Organization
                  <Text style={styles.optionalLabel}> (Optional)</Text>
                </Text>
                <View style={[styles.inputContainer, styles.inputShadow]}>
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
                  <View style={styles.iconContainer}>
                    <Ionicons name="business" size={20} color="#0EA5E9" />
                  </View>
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <Ionicons name="mail" size={14} color={Colors.gray[600]} /> Email Address
                </Text>
                <View style={[styles.inputContainer, styles.inputShadow]}>
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
                  <View style={styles.iconContainer}>
                    <Ionicons name="mail" size={20} color="#0EA5E9" />
                  </View>
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  <Ionicons name="lock-closed" size={14} color={Colors.gray[600]} /> Password
                </Text>
                <View style={[styles.inputContainer, styles.inputShadow]}>
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
                    style={styles.iconContainer}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#0EA5E9" 
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
                activeOpacity={0.8}
                accessibilityLabel="Sign in"
                accessibilityRole="button"
                style={styles.loginButtonShadow}
              >
                <LinearGradient
                  colors={isLoading ? ['#9CA3AF', '#6B7280'] : ['#0EA5E9', '#0284C7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loginButtonText}>Signing In...</Text>
                    </View>
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login */}
              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={[styles.socialButton, styles.socialButtonShadow]}
                  activeOpacity={0.8}
                  onPress={() => handleSocialLogin('google')}
                  disabled={socialLoading !== null}
                  accessibilityLabel="Sign in with Google"
                  accessibilityRole="button"
                >
                  <View style={styles.socialIconContainer}>
                    <Ionicons name="logo-google" size={20} color="#EA4335" />
                  </View>
                  <Text style={styles.socialButtonText}>
                    {socialLoading === 'google' ? 'Connecting...' : 'Google'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.socialButton, styles.socialButtonShadow]}
                  activeOpacity={0.8}
                  onPress={() => handleSocialLogin('apple')}
                  disabled={socialLoading !== null}
                  accessibilityLabel="Sign in with Apple"
                  accessibilityRole="button"
                >
                  <View style={styles.socialIconContainer}>
                    <Ionicons name="logo-apple" size={20} color="#000000" />
                  </View>
                  <Text style={styles.socialButtonText}>
                    {socialLoading === 'apple' ? 'Connecting...' : 'Apple'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.ssoButton, styles.socialButtonShadow]}
                  activeOpacity={0.8}
                  onPress={handleSSOLogin}
                  accessibilityLabel="Enterprise SSO"
                  accessibilityRole="button"
                >
                  <View style={styles.ssoIconContainer}>
                    <Ionicons name="business" size={18} color="#0EA5E9" />
                  </View>
                  <Text style={styles.ssoButtonText}>Enterprise SSO</Text>
                </TouchableOpacity>
              </View>

              {/* Clear Cache Button - Dev/Debug Only */}
              {__DEV__ && (
                <TouchableOpacity
                  onPress={async () => {
                    Alert.alert(
                      'Clear Cache & Logout',
                      'This will log you out and clear all cached data. You will need to login again.',
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
                  <Ionicons name="trash-outline" size={16} color={Colors.gray[500]} />
                  <Text style={styles.clearCacheText}>Clear Cache & Logout (Dev)</Text>
                </TouchableOpacity>
              )}

              {/* Footer */}
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.footer}
                accessibilityLabel="Create new account"
                accessibilityRole="button"
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
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[8],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[6],
  },
  content: {
    paddingTop: Spacing[6],
  },
  headerContainer: {
    marginBottom: Spacing[8],
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: Spacing[2],
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: Spacing[5],
  },
  label: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[700],
    marginBottom: Spacing[3],
    fontWeight: '600',
  },
  optionalLabel: {
    color: Colors.gray[500],
    fontWeight: '400',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    borderRadius: 28,
    paddingHorizontal: Spacing[5],
    height: 56,
  },
  inputShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.gray[900],
    paddingRight: Spacing[3],
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gray[300],
    justifyContent: 'center',
    paddingHorizontal: 2,
    marginRight: Spacing[2],
  },
  toggleActive: {
    backgroundColor: '#0EA5E9',
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  rememberText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[700],
  },
  forgotText: {
    fontSize: Typography.fontSize.sm,
    color: '#0EA5E9',
    fontWeight: '500',
  },
  loginButton: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonShadow: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 30,
    marginBottom: Spacing[6],
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.fontSize.lg,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray[200],
  },
  dividerText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[500],
    marginHorizontal: Spacing[4],
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: Spacing[4],
    borderRadius: 28,
    marginBottom: Spacing[5],
    gap: Spacing[3],
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: '#DC2626',
    fontWeight: '500',
  },
  socialButtons: {
    gap: Spacing[3],
  },
  socialButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    flexDirection: 'row',
    gap: Spacing[3],
  },
  socialButtonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  socialIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    color: Colors.gray[900],
    fontWeight: '600',
    fontSize: Typography.fontSize.base,
  },
  ssoButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    borderWidth: 2,
    borderColor: '#BAE6FD',
    flexDirection: 'row',
    gap: Spacing[2],
  },
  ssoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ssoButtonText: {
    color: Colors.gray[900],
    fontWeight: '600',
    fontSize: Typography.fontSize.base,
  },
  clearCacheButton: {
    marginTop: Spacing[4],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    borderRadius: 16,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
  },
  clearCacheText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing[6],
  },
  footerText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[700],
  },
  footerLink: {
    color: '#0EA5E9',
    fontWeight: '600',
  },
});
