/**
 * Forgot Password Screen — Senior UI/UX Creative Enterprise Design
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
import { useNavigation } from '@react-navigation/native';
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

type NavigationProp = AuthStackScreenProps<'ForgotPassword'>['navigation'];

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

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { width, height } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const HEADER_H = Math.min(height * 0.31, 250);
  const logoW = Math.min(width * 0.48, 200);
  const logoH = logoW * (0.25 / 0.7);

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Error', t('auth.forgot.enterEmail', 'Please enter your registered email address'));
      return;
    }
    setLoading(true);
    try {
      await authApi.post('/auth/forgot-password', { email: trimmed });
      setSent(true);
    } catch (error: any) {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
              <Ionicons name="mail-open-outline" size={38} color="#0284C7" />
            </View>
            <Text style={styles.title}>{t('auth.forgot.checkEmailTitle', 'Check Your Email')}</Text>
            <Text style={styles.subtitle}>
              We sent password recovery instructions to <Text style={styles.strongText}>{email.trim()}</Text>
            </Text>
            <TouchableOpacity style={styles.primaryShadow} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <LinearGradient colors={[BRAND_TEAL, BRAND_TEAL_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
                <Ionicons name="arrow-back-outline" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.primaryText}>{t('auth.forgot.backToLogin', 'Back to Login')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Didn’t receive the link? <Text style={styles.footerLink} onPress={handleSubmit}>Resend</Text></Text>
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
              <Text style={styles.title}>{t('auth.forgot.title', 'Forgot Password?')}</Text>
              <Text style={styles.subtitle}>{t('auth.forgot.subtitle', 'Enter your account email address and we will send you a link to reset your password.')}</Text>
            </View>

            {/* Creative Capsule Input with Circular Icon Badge */}
            <View style={styles.inputCapsule}>
              <View style={styles.iconCircleBadge}>
                <Ionicons name="mail-outline" size={18} color="#0284C7" />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('auth.forgot.emailPlaceholder', 'name@stunity.edu.kh')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="send"
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
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                {loading ? (
                  <Text style={styles.primaryText}>{t('auth.forgot.sending', 'Sending...')}</Text>
                ) : (
                  <>
                    <Text style={styles.primaryText}>{t('auth.forgot.sendResetLink', 'Send Recovery Link')}</Text>
                    <Ionicons name="send-outline" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.footer} activeOpacity={0.75}>
            <Text style={styles.footerLink}>← Back to Login</Text>
          </TouchableOpacity>
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

  iconCircleSuccess: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  titleGroup: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '900', color: INK, marginBottom: 6, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20, maxWidth: 340 },
  strongText: { fontWeight: '800', color: '#0284C7' },

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
    marginBottom: 20,
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

  // Button
  primaryShadow: {
    shadowColor: BRAND_TEAL,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
    borderRadius: 9999,
    width: '100%',
  },
  primaryButton: { height: 64, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  buttonDisabled: { opacity: 0.6 },

  footer: { alignItems: 'center', paddingVertical: 12 },
  footerText: { fontSize: 14, color: MUTED, fontWeight: '600' },
  footerLink: { color: BRAND_TEAL, fontWeight: '800', fontSize: 15 },
});
