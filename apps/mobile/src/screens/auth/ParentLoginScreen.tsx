/**
 * Parent Login Screen — "Perfect" Flat Design
 *
 * Matches the student login aesthetic:
 * Centered logo, pill-style inputs, social row, no wavy header.
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import StunityLogo from '../../../assets/Stunity.svg';
import { Colors, Typography, Spacing } from '@/config';
import { useAuthStore } from '@/stores';
import { AuthStackScreenProps } from '@/navigation/types';

const BRAND_TEAL = '#09CFF7';
const BRAND_TEAL_DARK = '#00B8DB';

type NavigationProp = AuthStackScreenProps<'ParentLogin'>['navigation'];

export default function ParentLoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { parentLogin, logout, isLoading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your phone number and password');
      return;
    }

    clearError();
    const success = await parentLogin({
      phone: phone.trim(),
      password,
    });

    if (!success && error) {
      Alert.alert('Login Failed', error);
    }
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
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.gray[800]} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <StunityLogo width={140} height={140} style={{ marginBottom: 12 }} />
              <Text style={styles.title}>Sign in to Parent Portal</Text>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Form */}
            <View>
              {/* Phone Input */}
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  placeholderTextColor={Colors.gray[400]}
                />
              </View>

              {/* Password Input */}
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
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={Colors.gray[400]}
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <View style={styles.optionsRow}>
                <View style={{ flex: 1 }} />
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
                  colors={isLoading ? ['#94A3B8', '#94A3B8'] : [BRAND_TEAL, BRAND_TEAL_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.signInButton}
                >
                  <Text style={styles.signInText}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* School Portal Switch */}
            <View style={styles.oauthRow}>
              <TouchableOpacity
                style={[styles.oauthButton, styles.portalSwitchButton]}
                onPress={() => navigation.navigate('Login')}
              >
                <Ionicons name="business-outline" size={22} color={BRAND_TEAL} />
                <Text style={styles.portalSwitchText}>Student / Teacher Portal</Text>
              </TouchableOpacity>
            </View>

            {/* Dev cache clear */}
            {__DEV__ && (
              <TouchableOpacity
                onPress={async () => {
                  Alert.alert('Clear Cache', 'Clear all cached data?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Clear', style: 'destructive', onPress: async () => { await AsyncStorage.clear(); await logout(); } }
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
            <TouchableOpacity
              onPress={() => navigation.navigate('ParentRegister')}
              style={styles.footer}
            >
              <Text style={styles.footerText}>
                Don't have an account? <Text style={styles.footerLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginTop: 4,
  },
  header: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray[900],
    letterSpacing: -0.3,
  },
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  forgotText: {
    fontSize: 13,
    color: BRAND_TEAL,
    fontWeight: '600',
  },
  signInShadow: {
    shadowColor: BRAND_TEAL,
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
  portalSwitchButton: {
    width: 'auto',
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 18,
    flexDirection: 'row',
    gap: 8,
  },
  portalSwitchText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
  },
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
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  footerLink: {
    color: BRAND_TEAL,
    fontWeight: '700',
  },
});
