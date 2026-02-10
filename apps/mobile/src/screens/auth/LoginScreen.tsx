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

import { Button, Input } from '@/components/common';
import { Colors, Typography, Spacing } from '@/config';
import { useAuthStore } from '@/stores';
import { AuthStackScreenProps } from '@/navigation/types';

type NavigationProp = AuthStackScreenProps<'Login'>['navigation'];

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { login, isLoading, error, clearError} = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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

  return (
    <View style={styles.container}>
      {/* Light Yellow to White Gradient Background */}
      <LinearGradient
        colors={['#FEF3C7', '#FFFFFF']}
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
              <Text style={styles.title}>Hello there 👋</Text>
              <Text style={styles.subtitle}>
                Please enter your email & password to access your account
              </Text>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <View style={styles.inputContainer}>
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
                  <Ionicons name="mail" size={20} color="#F59E0B" style={styles.inputIcon} />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    placeholderTextColor={Colors.gray[400]}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#F59E0B" 
                      style={styles.inputIcon} 
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
              >
                <LinearGradient
                  colors={['#F59E0B', '#D97706']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? 'Signing In...' : 'Continue'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Social Login */}
              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  style={styles.socialButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-google" size={20} color={Colors.gray[700]} style={styles.socialIcon} />
                  <Text style={styles.socialButtonText}>Continue With Google</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.socialButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-apple" size={20} color={Colors.gray[700]} style={styles.socialIcon} />
                  <Text style={styles.socialButtonText}>Continue With Apple</Text>
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.footer}
              >
                <Text style={styles.footerText}>
                  New here? Create an account. <Text style={styles.footerLink}>Sign up</Text>
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
    paddingTop: Spacing[4],
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    marginBottom: Spacing[8],
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: Spacing[5],
  },
  label: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[700],
    marginBottom: Spacing[2],
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
    borderRadius: 28,
    paddingHorizontal: Spacing[5],
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.gray[900],
    paddingRight: Spacing[3],
  },
  inputIcon: {
    marginLeft: Spacing[3],
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
    backgroundColor: '#F59E0B',
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
    color: '#F59E0B',
    fontWeight: '500',
  },
  loginButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  loginButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Typography.fontSize.base,
  },
  socialButtons: {
    gap: Spacing[3],
  },
  socialButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: Colors.gray[200],
    flexDirection: 'row',
  },
  socialIcon: {
    marginRight: Spacing[2],
  },
  socialButtonText: {
    color: Colors.gray[900],
    fontWeight: '500',
    fontSize: Typography.fontSize.base,
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
    color: '#F59E0B',
    fontWeight: '600',
  },
});
