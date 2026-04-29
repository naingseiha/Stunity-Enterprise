import { useTranslation } from 'react-i18next';
import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * Register Screen — Premium Enterprise Design
 * 
 * 4-step registration with gradient progress, glass cards, enhanced role selection
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
  Dimensions, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';


import { Button, Input } from '@/components/common';
import { Colors, Typography, Spacing } from '@/config';
import { useAuthStore } from '@/stores';
import { AuthStackScreenProps } from '@/navigation/types';
import { UserRole } from '@/types';
import { validatePassword } from '@/utils';
import { authApi } from '@/api/client';

const BRAND_TEAL = '#09CFF7';
const BRAND_TEAL_DARK = '#00B8DB';

const { width } = Dimensions.get('window');

type NavigationProp = AuthStackScreenProps<'Register'>['navigation'];

const ROLES: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap; description: string; color: string; bg: string }[] = [
  { value: 'STUDENT', label: 'Student', icon: 'school-outline', description: 'I want to learn', color: BRAND_TEAL, bg: '#ECFEFF' },
  { value: 'TEACHER', label: 'Educator', icon: 'easel-outline', description: 'I want to teach', color: '#8B5CF6', bg: '#F3E8FF' },
  { value: 'PARENT', label: 'Parent', icon: 'people-outline', description: "I'm a parent", color: '#F59E0B', bg: '#FEF3C7' },
];

const STEP_ICONS: (keyof typeof Ionicons.glyphMap)[] = ['person', 'people', 'lock-closed'];
const STEP_LABELS = ['Info', 'Role', 'Account'];

export default function RegisterScreen() {
    const { t: autoT } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { register, login, isLoading, error, clearError } = useAuthStore();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationType, setOrganizationType] = useState<'university' | 'school' | 'corporate' | 'other'>('university');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptCompliance, setAcceptCompliance] = useState(false);

  // Eliminated Claim Code state here

  const lastNameRef = useRef<TextInput>(null);
  const organizationRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const passwordValidation = validatePassword(password);

  const handleNextStep = () => {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert('Required', 'Please enter your first and last name');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() && !phone.trim()) {
      Alert.alert('Required', 'Please enter your email or phone number (at least one required)');
      return;
    }
    if (!passwordValidation.isValid) {
      Alert.alert('Password Requirements', 'Your password must include:\n' + passwordValidation.errors.join('\n'));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The passwords you entered do not match');
      return;
    }
    if (!acceptTerms || !acceptPrivacy || !acceptCompliance) {
      Alert.alert('Required', 'Please accept all terms and policies');
      return;
    }

    clearError();

    const success = await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      password,
      role,
      // No organization for manual unlinked registration
      organization: undefined,
      organizationType: undefined,
    });

    if (success) {
      Alert.alert('Account Created', 'Your account has been created successfully.');
    } else if (error) {
      Alert.alert('Registration Failed', error);
    }
  };

  // ── Progress Bar ────────────────────────────────────────
  const renderProgress = () => (
    <View style={s.progressContainer}>
      {[1, 2, 3].map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && (
            <View style={[s.progressLine, n <= step && s.progressLineActive]} />
          )}
          <View style={[s.progressStep, n <= step && s.progressStepActive, n < step && s.progressStepComplete]}>
            {n < step ? (
              <Ionicons name="checkmark" size={12} color="#fff" />
            ) : (
              <Ionicons name={STEP_ICONS[i]} size={12} color={n <= step ? '#fff' : Colors.gray[400]} />
            )}
          </View>
        </React.Fragment>
      ))}
    </View>
  );

  // ── Step 1: Personal Info ────────────────────────────────
  const renderStep1 = () => (
    <Animated.View style={s.stepContent}>
      {renderProgress()}

      <View style={s.stepHeader}>
        <View style={[s.stepIconBg, { backgroundColor: '#ECFEFF' }]}>
          <Ionicons name="person" size={22} color={BRAND_TEAL} />
        </View>
        <Text style={s.stepTitle}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_049d0bd9" /></Text>
        <Text style={s.stepSubtitle}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_09b9d621" /></Text>
      </View>

      <View style={s.formSection}>
        <Input
          label={autoT("auto.mobile.screens_auth_RegisterScreen.k_bb4384a5")}
          placeholder={autoT("auto.mobile.screens_auth_RegisterScreen.k_f77624c6")}
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          leftIcon="person-outline"
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
        />

        <Input
          ref={lastNameRef}
          label={autoT("auto.mobile.screens_auth_RegisterScreen.k_2746112a")}
          placeholder={autoT("auto.mobile.screens_auth_RegisterScreen.k_9a61f7f6")}
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          leftIcon="person-outline"
          returnKeyType="next"
          onSubmitEditing={handleNextStep}
        />
      </View>

      <TouchableOpacity onPress={handleNextStep} activeOpacity={0.85} style={s.ctaShadow}>
        <LinearGradient colors={['#0EA5E9', '#0284C7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaButton}>
          <Text style={s.ctaText}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_2cab7586" /></Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <View style={s.claimFastTrackContainer}>
        <View style={s.miniDivider} />
        <Text style={s.fastTrackText}>OR</Text>
        <View style={s.miniDivider} />
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('ClaimCodeSetup')}
        activeOpacity={0.7}
        style={s.fastTrackButton}
      >
        <Ionicons name="qr-code-outline" size={18} color={BRAND_TEAL} />
        <Text style={s.fastTrackButtonText}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_92f9ea6c" /></Text>
        <Ionicons name="chevron-forward" size={14} color={BRAND_TEAL} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>
    </Animated.View>
  );

  // ── Step 2: Role Selection ──────────────────────────────
  const renderStep2 = () => (
    <Animated.View style={s.stepContent}>
      {renderProgress()}

      <View style={s.stepHeader}>
        <View style={[s.stepIconBg, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="people" size={22} color="#F59E0B" />
        </View>
        <Text style={s.stepTitle}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_4ec6c861" /></Text>
        <Text style={s.stepSubtitle}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_0073c7e3" /></Text>
      </View>

      <View style={s.rolesContainer}>
        {ROLES.map((r, i) => (
          <Animated.View key={r.value}>
            <TouchableOpacity
              style={[s.roleCard, role === r.value && { borderColor: r.color, backgroundColor: r.bg }]}
              onPress={() => setRole(r.value)}
              activeOpacity={0.8}
            >
              <View style={[s.roleIcon, { backgroundColor: role === r.value ? r.color : r.bg }]}>
                <Ionicons
                  name={r.icon}
                  size={24}
                  color={role === r.value ? '#fff' : r.color}
                />
              </View>
              <View style={s.roleInfo}>
                <Text style={[s.roleLabel, role === r.value && { color: r.color }]}>{r.label}</Text>
                <Text style={s.roleDescription}>{r.description}</Text>
              </View>
              {!!(role === r.value) && (
                <Animated.View>
                  <Ionicons name="checkmark-circle" size={24} color={r.color} />
                </Animated.View>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <TouchableOpacity onPress={handleNextStep} activeOpacity={0.85} style={s.ctaShadow}>
        <LinearGradient colors={['#0EA5E9', '#0284C7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaButton}>
          <Text style={s.ctaText}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_2cab7586" /></Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // ── Step 3: Credentials ─────────────────────────────────
  const renderStep3 = () => (
    <Animated.View style={s.stepContent}>
      {renderProgress()}

      <View style={s.stepHeader}>
        <View style={[s.stepIconBg, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="lock-closed" size={22} color="#10B981" />
        </View>
        <Text style={s.stepTitle}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_15dd52f9" /></Text>
        <Text style={s.stepSubtitle}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_b28c66ea" /></Text>
      </View>

      <View style={s.formSection}>
        <Text style={s.emailPhoneHint}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_c2ed9679" /></Text>
        <Input
          ref={emailRef}
          label={autoT("auto.mobile.screens_auth_RegisterScreen.k_a0bfad1c")}
          placeholder={autoT("auto.mobile.screens_auth_RegisterScreen.k_2615ad34")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Input
          label={autoT("auto.mobile.screens_auth_RegisterScreen.k_b25c6ca0")}
          placeholder={autoT("auto.mobile.screens_auth_RegisterScreen.k_bb0083eb")}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          leftIcon="call-outline"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Input
          ref={passwordRef}
          label={autoT("auto.mobile.screens_auth_RegisterScreen.k_fd4de7da")}
          placeholder={autoT("auto.mobile.screens_auth_RegisterScreen.k_c46e788b")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon="lock-closed-outline"
          showPasswordToggle
          hint={password ? (passwordValidation.isValid ? '✓ Password meets requirements' : passwordValidation.errors[0]) : 'At least 8 characters, 1 uppercase, 1 number'}
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
        />

        <Input
          ref={confirmPasswordRef}
          label={autoT("auto.mobile.screens_auth_RegisterScreen.k_167447b2")}
          placeholder={autoT("auto.mobile.screens_auth_RegisterScreen.k_fc3cf43b")}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          leftIcon="lock-closed-outline"
          showPasswordToggle
          error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
          returnKeyType="done"
          onSubmitEditing={handleRegister}
        />
      </View>

      {/* Compliance */}
      <View style={s.complianceCard}>
        {[
          { state: acceptTerms, set: setAcceptTerms, label: 'Terms of Service' },
          { state: acceptPrivacy, set: setAcceptPrivacy, label: 'Privacy Policy' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => item.set(!item.state)}
            style={s.checkRow}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, !!item.state && s.checkboxChecked]}>
              {!!item.state && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={s.checkText}>
              <AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_365d06ca" /> <Text style={s.checkLink}>{item.label}</Text>
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setAcceptCompliance(!acceptCompliance)}
          style={s.checkRow}
          activeOpacity={0.7}
        >
          <View style={[s.checkbox, !!acceptCompliance && s.checkboxChecked]}>
            {!!acceptCompliance && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text style={s.checkText}>
            <AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_3da6759f" /> <Text style={s.checkLink}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_26f6d9b7" /></Text> <AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_b0f59f80" /> <Text style={s.checkLink}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_ba349bdd" /></Text>
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Animated.View style={s.errorContainer}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" />
          <Text style={s.errorText}>{error}</Text>
        </Animated.View>
      )}

      <TouchableOpacity
        onPress={handleRegister}
        disabled={isLoading}
        activeOpacity={0.85}
        style={s.ctaShadow}
      >
        <LinearGradient
          colors={isLoading ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.ctaButton}
        >
          {isLoading ? (
            <Text style={s.ctaText}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_588edc3c" /></Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={[s.ctaText, { marginLeft: 8 }]}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_ddf8711e" /></Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {email.trim() && (
        <View style={s.verifyNote}>
          <Ionicons name="mail-outline" size={14} color={Colors.gray[500]} />
          <Text style={s.verifyText}>
            <AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_17ecc92b" />
          </Text>
        </View>
      )}
    </Animated.View>
  );

  return (
    <View style={s.container}>
      {/* Premium Background */}
      <LinearGradient
        colors={['#ECFEFF', '#F0F9FF', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Decorative Blobs */}
      <View style={s.blob1} />
      <View style={s.blob2} />

      <SafeAreaView style={s.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View style={s.header}>
              <TouchableOpacity
                onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
                style={s.backButton}
              >
                <Ionicons name="chevron-back" size={22} color={Colors.gray[700]} />
              </TouchableOpacity>

              <Text style={s.headerTitle}><AutoI18nText i18nKey="auto.mobile.screens_auth_RegisterScreen.k_a069174f" /></Text>
              <View style={s.stepBadge}>
                <Text style={s.stepBadgeText}>{step}/3</Text>
              </View>
            </Animated.View>

            {/* Step Content */}
            <Animated.View style={s.content}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },

  // ── Decorative ────────────────────────────────────────
  blob1: {
    position: 'absolute', top: -50, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(14,165,233,0.08)',
  },
  blob2: {
    position: 'absolute', bottom: 80, left: -60,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(139,92,246,0.05)',
  },

  // ── Header ────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',

    shadowOpacity: 0.05,
    shadowRadius: 4,

  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray[900],
    flex: 1,
    textAlign: 'center',
  },
  stepBadge: {
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_TEAL,
  },
  content: { flex: 1 },
  stepContent: { flex: 1 },

  // ── Progress ──────────────────────────────────────────
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  progressStep: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  progressStepActive: {
    backgroundColor: BRAND_TEAL,
    borderColor: BRAND_TEAL,
  },
  progressStepComplete: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: BRAND_TEAL,
  },

  // ── Step Header ───────────────────────────────────────
  stepHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepIconBg: {
    width: 48,
    height: 48,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.gray[900],
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
  },

  // ── Glass Card ────────────────────────────────────────
  formSection: {
    marginBottom: 8,
  },
  emailPhoneHint: {
    fontSize: 13,
    color: Colors.gray[600],
    marginBottom: 12,
  },

  // ── CTA Button ────────────────────────────────────────
  ctaShadow: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
    borderRadius: 26,
    marginTop: 16,
  },
  ctaButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // ── Roles ─────────────────────────────────────────────
  rolesContainer: {
    gap: 12,
    marginBottom: 8,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    shadowColor: '#000',

    shadowOpacity: 0.04,


  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  roleInfo: { flex: 1 },
  roleLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: 13,
    color: Colors.gray[500],
  },

  // ── Org Type Grid ─────────────────────────────────────
  orgTypeLabel: {
    fontSize: 13,
    color: Colors.gray[700],
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  orgTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  orgTypeCard: {
    width: '47%' as any,
    padding: 14,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 6,
  },
  orgTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgTypeName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[600],
  },

  // ── Claim Code ────────────────────────────────────────
  claimToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 28,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  claimToggleActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  claimToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  claimToggleText: {
    fontSize: 14,
    color: Colors.gray[600],
    fontWeight: '600',
  },
  validateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 28,
    marginTop: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,

    elevation: 4,
  },
  validateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  validatedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 26,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  validatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  validatedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  validatedInfo: { marginTop: 6 },
  validatedLabel: {
    fontSize: 11,
    color: Colors.gray[500],
    fontWeight: '600',
    marginBottom: 2,
  },
  validatedValue: {
    fontSize: 14,
    color: Colors.gray[900],
    fontWeight: '600',
  },
  inputDisabled: {
    backgroundColor: Colors.gray[100],
    opacity: 0.7,
  },

  // ── Compliance ────────────────────────────────────────
  complianceCard: {
    gap: 14,
    marginTop: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  checkLink: {
    color: '#0EA5E9',
    fontWeight: '600',
  },

  // ── Error ─────────────────────────────────────────────
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    padding: 12,
    borderRadius: 26,
    marginTop: 12,
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

  // ── Verify Note ───────────────────────────────────────
  verifyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 28,
  },
  verifyText: {
    fontSize: 12,
    color: Colors.gray[500],
    fontWeight: '500',
  },
  claimFastTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 12,
  },
  miniDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
    opacity: 0.6,
  },
  fastTrackText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
  },
  fastTrackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFF',
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(9, 207, 247, 0.25)',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 8,
    shadowColor: BRAND_TEAL,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  fastTrackButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0284C7',
    letterSpacing: -0.2,
  },
});
