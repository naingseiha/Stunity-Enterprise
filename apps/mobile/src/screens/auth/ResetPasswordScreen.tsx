/**
 * Reset Password Screen — Senior UI/UX Creative Enterprise Design
 * Exact WelcomeScreen 120px WavyDivider, turquoise gradient header,
 * integrated circular icon badge capsule inputs, glowing cyan submit button, zero-scroll layout.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import StunityLogo from '../../../assets/Stunity.svg';

import { authApi } from '@/api/client';
import { AuthStackScreenProps } from '@/navigation/types';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/config';
const BRAND_TEAL = Colors.brand;
const BRAND_TEAL_DARK = '#00B8DB';
const INK = '#0F172A';
const MUTED = '#64748B';

type NavigationProp = AuthStackScreenProps<'ResetPassword'>['navigation'];
type ResetPasswordRouteProp = RouteProp<{ ResetPassword: { token: string } }, 'ResetPassword'>;

const WavyDivider = React.memo(function WavyDivider({ waveWidth }: { waveWidth: number }) {
  const w = waveWidth;
  return (
    <View style={styles.wavyContainer}>
      <Svg height={120} width={w} viewBox={`0 0 ${w} 120`} style={styles.wavySvg}>
        <Path d={`M0 20 C${w * 0.3} 10, ${w * 0.6} 90, ${w} 50 V120 H0 Z`} fill="white" opacity={0.3} />
        <Path d={`M0 40 C${w * 0.4} 30, ${w * 0.7} 110, ${w} 70 V120 H0 Z`} fill="white" opacity={0.6} />
        <Path d={`M0 60 C${w * 0.35} 50, ${w * 0.65} 130, ${w} 90 V120 H0 Z`} fill="white" />
      </Svg>
    </View>
  );
});

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResetPasswordRouteProp>();
  const { width, height } = useWindowDimensions();
  const token = route.params?.token || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const HEADER_H = Math.min(height * 0.31, 250);
  const logoW = Math.min(width * 0.48, 200);
  const logoH = logoW * (0.25 / 0.7);

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return t('auth.reset.passwordMin8', 'Password must be at least 8 characters long');
    if (!/[A-Z]/.test(pw)) return t('auth.reset.passwordNeedUpper', 'Include at least one uppercase letter');
    if (!/[a-z]/.test(pw)) return t('auth.reset.passwordNeedLower', 'Include at least one lowercase letter');
    if (!/[0-9]/.test(pw)) return t('auth.reset.passwordNeedNumber', 'Include at least one number');
    if (!/[^A-Za-z0-9]/.test(pw)) return t('auth.reset.passwordNeedSpecial', 'Include at least one special symbol');
    return null;
  };

  const handleSubmit = async () => {
    const pwError = validatePassword(password);
    if (pwError) {
      Alert.alert(t('auth.reset.weakPasswordTitle', 'Weak Password'), pwError);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', t('auth.reset.passwordsNotMatch', 'Passwords do not match'));
      return;
    }

    setLoading(true);
    try {
      await authApi.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (error: any) {
      const msg = error.response?.data?.error || t('auth.reset.failedReset', 'Failed to reset password');
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerSection, { height: HEADER_H }]}>
          <LinearGradient colors={['#FFFFFF', '#ECFEFF', BRAND_TEAL]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          <View style={styles.logoWrap}><StunityLogo width={logoW} height={logoH} /></View>
          <WavyDivider waveWidth={width} />
        </View>
        <View style={styles.contentArea}>
          <View style={styles.formShell}>
            <View style={styles.iconCircleSuccess}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#10B981" />
            </View>
            <Text style={styles.title}>{t('auth.reset.successTitle', 'Password Updated!')}</Text>
            <Text style={styles.subtitle}>{t('auth.reset.successSubtitle', 'Your account security credentials have been updated successfully.')}</Text>
            <TouchableOpacity
              style={styles.primaryShadow}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[BRAND_TEAL, BRAND_TEAL_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
                <Text style={styles.primaryText}>{t('auth.reset.goToLogin', 'Go to Login')}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerSection, { height: HEADER_H }]}>
        <LinearGradient colors={['#FFFFFF', '#ECFEFF', BRAND_TEAL]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <SafeAreaView style={styles.headerSafeArea}>
          <TouchableOpacity style={styles.backCapsule} onPress={() => navigation.goBack()} activeOpacity={0.75}>
            <Ionicons name="chevron-back" size={22} color={INK} />
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.logoWrap}><StunityLogo width={logoW} height={logoH} /></View>
        <WavyDivider waveWidth={width} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.contentArea}>
          <View style={styles.formShell}>
            <View style={styles.titleGroup}>
              <Text style={styles.title}>{t('auth.reset.newPasswordTitle', 'Create New Password')}</Text>
              <Text style={styles.subtitle}>{t('auth.reset.newPasswordSubtitle', 'Your new password must be unique and satisfy enterprise complexity requirements.')}</Text>
            </View>

            {/* New Password Capsule */}
            <View style={styles.inputCapsule}>
              <View style={styles.iconCircleBadge}>
                <Ionicons name="lock-closed-outline" size={18} color="#0284C7" />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('auth.reset.newPasswordPlaceholder', 'New Password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Capsule */}
            <View style={styles.inputCapsule}>
              <View style={styles.iconCircleBadge}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#0284C7" />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('auth.reset.confirmPasswordPlaceholder', 'Confirm New Password')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryShadow, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={loading ? ['#94A3B8', '#94A3B8'] : [BRAND_TEAL, BRAND_TEAL_DARK]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryText}>
                  {loading ? t('auth.reset.resetting', 'Updating...') : t('auth.reset.resetPassword', 'Update Password')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Header & Wave
  headerSection: { width: '100%', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  headerSafeArea: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backCapsule: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginLeft: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  logoWrap: { alignItems: 'center', justifyContent: 'center', paddingBottom: 40, paddingTop: 10 },
  wavyContainer: { position: 'absolute', bottom: -1, width: '100%' },
  wavySvg: { bottom: 0 },

  // Content Area
  contentArea: { flex: 1, paddingHorizontal: 32, paddingTop: 10, paddingBottom: 16, justifyContent: 'space-between' },
  formShell: { width: '100%', alignItems: 'center' },

  iconCircleSuccess: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  titleGroup: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: INK, marginBottom: 6, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, maxWidth: 340 },

  // Input Capsule
  inputCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 9999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    marginBottom: 14,
    width: '100%',
  },
  iconCircleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  input: { flex: 1, fontSize: 16, color: INK, height: '100%', paddingRight: 14 },
  eyeBtn: { paddingHorizontal: 12 },

  // Button
  primaryShadow: {
    shadowColor: BRAND_TEAL,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
    borderRadius: 9999,
    width: '100%',
    marginTop: 6,
  },
  primaryButton: { height: 64, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  buttonDisabled: { opacity: 0.6 },
});
