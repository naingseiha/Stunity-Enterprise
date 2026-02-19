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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';

import { Button, Input } from '@/components/common';
import { Colors, Typography, Spacing } from '@/config';
import { useAuthStore } from '@/stores';
import { AuthStackScreenProps } from '@/navigation/types';
import { UserRole } from '@/types';
import { validatePassword } from '@/utils';
import { authApi } from '@/api/client';

const { width } = Dimensions.get('window');

type NavigationProp = AuthStackScreenProps<'Register'>['navigation'];

const ROLES: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap; description: string; color: string; bg: string }[] = [
  { value: 'STUDENT', label: 'Student', icon: 'school-outline', description: 'I want to learn', color: '#0EA5E9', bg: '#E0F2FE' },
  { value: 'TEACHER', label: 'Educator', icon: 'easel-outline', description: 'I want to teach', color: '#8B5CF6', bg: '#F3E8FF' },
  { value: 'PARENT', label: 'Parent', icon: 'people-outline', description: "I'm a parent", color: '#F59E0B', bg: '#FEF3C7' },
];

const STEP_ICONS: (keyof typeof Ionicons.glyphMap)[] = ['person', 'business', 'people', 'lock-closed'];
const STEP_LABELS = ['Info', 'Org', 'Role', 'Account'];

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { register, login, isLoading, error, clearError } = useAuthStore();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationType, setOrganizationType] = useState<'university' | 'school' | 'corporate' | 'other'>('university');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptCompliance, setAcceptCompliance] = useState(false);

  // Claim code states
  const [useClaimCode, setUseClaimCode] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimCodeValidated, setClaimCodeValidated] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [claimCodeData, setClaimCodeData] = useState<any>(null);

  const lastNameRef = useRef<TextInput>(null);
  const organizationRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const passwordValidation = validatePassword(password);

  const handleValidateClaimCode = async () => {
    if (!claimCode.trim()) {
      Alert.alert('Required', 'Please enter a claim code');
      return;
    }

    setValidatingCode(true);
    try {
      const response = await authApi.post('/auth/claim-codes/validate', {
        code: claimCode.trim(),
      });

      if (response.data.success) {
        const data = response.data.data;
        setClaimCodeValidated(true);
        setClaimCodeData(data);
        setOrganization(data.school.name);

        const schoolTypeMap: Record<string, any> = {
          'PRIMARY_SCHOOL': 'school',
          'SECONDARY_SCHOOL': 'school',
          'HIGH_SCHOOL': 'school',
          'UNIVERSITY': 'university',
          'INTERNATIONAL': 'school',
        };
        setOrganizationType(schoolTypeMap[data.school.schoolType] || 'school');

        if (data.type === 'STUDENT') setRole('STUDENT');
        else if (data.type === 'TEACHER') setRole('TEACHER');

        Alert.alert('Claim Code Validated', `Successfully linked to ${data.school.name}`);
      } else {
        Alert.alert('Invalid', response.data.error || 'Please check your code');
        setClaimCodeValidated(false);
        setClaimCodeData(null);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Unable to validate claim code.');
      setClaimCodeValidated(false);
      setClaimCodeData(null);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert('Required', 'Please enter your first and last name');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (useClaimCode) {
        if (!claimCodeValidated) {
          Alert.alert('Required', 'Please validate your claim code first');
          return;
        }
      } else {
        if (!organization.trim()) {
          Alert.alert('Required', 'Please enter your organization');
          return;
        }
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleRegister = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address');
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

    if (useClaimCode && claimCodeValidated && claimCodeData) {
      try {
        const response = await authApi.post('/auth/register/with-claim-code', {
          code: claimCode.trim(),
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          verificationData: claimCodeData.requiresVerification ? {
            dateOfBirth: claimCodeData.student?.dateOfBirth || claimCodeData.teacher?.dateOfBirth
          } : undefined,
        });

        if (response.data.success) {
          const loginSuccess = await login({
            email: email.trim(),
            password,
            rememberMe: true,
          });

          if (loginSuccess) {
            Alert.alert('Account Created', `Welcome to ${claimCodeData.school.name}!`);
          }
        } else {
          Alert.alert('Failed', response.data.error || 'Unable to create account');
        }
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Unable to complete registration.');
      }
      return;
    }

    const success = await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      role,
      organization: organization.trim() || undefined,
      organizationType,
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
      {[1, 2, 3, 4].map((n, i) => (
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
    <Animated.View entering={FadeIn.duration(400)} style={s.stepContent}>
      {renderProgress()}

      <View style={s.stepHeader}>
        <View style={[s.stepIconBg, { backgroundColor: '#E0F2FE' }]}>
          <Ionicons name="person" size={22} color="#0EA5E9" />
        </View>
        <Text style={s.stepTitle}>Personal Information</Text>
        <Text style={s.stepSubtitle}>Let's start with your name</Text>
      </View>

      <View style={s.formSection}>
        <Input
          label="First Name"
          placeholder="Enter your first name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          leftIcon="person-outline"
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
        />

        <Input
          ref={lastNameRef}
          label="Last Name"
          placeholder="Enter your last name"
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
          <Text style={s.ctaText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // ── Step 2: Organization ────────────────────────────────
  const renderStep2 = () => (
    <Animated.View entering={FadeIn.duration(400)} style={s.stepContent}>
      {renderProgress()}

      <View style={s.stepHeader}>
        <View style={[s.stepIconBg, { backgroundColor: '#F3E8FF' }]}>
          <Ionicons name="business" size={22} color="#8B5CF6" />
        </View>
        <Text style={s.stepTitle}>Organization</Text>
        <Text style={s.stepSubtitle}>Your institution or use a claim code</Text>
      </View>

      {/* Claim Code Toggle */}
      <TouchableOpacity
        style={[s.claimToggle, useClaimCode && s.claimToggleActive]}
        onPress={() => {
          setUseClaimCode(!useClaimCode);
          setClaimCodeValidated(false);
          setClaimCodeData(null);
          setClaimCode('');
        }}
        activeOpacity={0.7}
      >
        <View style={s.claimToggleRow}>
          <Ionicons
            name={useClaimCode ? "checkmark-circle" : "radio-button-off-outline"}
            size={20}
            color={useClaimCode ? "#0EA5E9" : Colors.gray[400]}
          />
          <Text style={[s.claimToggleText, useClaimCode && { color: '#0EA5E9' }]}>
            I have a school claim code
          </Text>
        </View>
        <Ionicons name="ticket-outline" size={16} color={useClaimCode ? '#0EA5E9' : Colors.gray[400]} />
      </TouchableOpacity>

      <View style={s.formSection}>
        {useClaimCode ? (
          <>
            <Input
              label="Claim Code"
              placeholder="e.g., STNT-AB12-CD34"
              value={claimCode}
              onChangeText={(text) => {
                setClaimCode(text.toUpperCase());
                setClaimCodeValidated(false);
              }}
              leftIcon="ticket-outline"
              autoCapitalize="characters"
              editable={!claimCodeValidated}
              style={claimCodeValidated ? s.inputDisabled : undefined}
            />

            {claimCodeValidated && claimCodeData && (
              <Animated.View entering={FadeIn.duration(300)} style={s.validatedCard}>
                <View style={s.validatedHeader}>
                  <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                  <Text style={s.validatedTitle}>Validated Successfully</Text>
                </View>
                <View style={s.validatedInfo}>
                  <Text style={s.validatedLabel}>School:</Text>
                  <Text style={s.validatedValue}>{claimCodeData.school.name}</Text>
                </View>
                {claimCodeData.student && (
                  <View style={s.validatedInfo}>
                    <Text style={s.validatedLabel}>Student:</Text>
                    <Text style={s.validatedValue}>{claimCodeData.student.firstName} {claimCodeData.student.lastName}</Text>
                  </View>
                )}
                {claimCodeData.teacher && (
                  <View style={s.validatedInfo}>
                    <Text style={s.validatedLabel}>Teacher:</Text>
                    <Text style={s.validatedValue}>{claimCodeData.teacher.firstName} {claimCodeData.teacher.lastName}</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {!claimCodeValidated && (
              <TouchableOpacity
                style={[s.validateBtn, validatingCode && { opacity: 0.5 }]}
                onPress={handleValidateClaimCode}
                disabled={validatingCode || !claimCode.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark" size={16} color="#fff" />
                <Text style={s.validateBtnText}>
                  {validatingCode ? 'Validating...' : 'Validate Code'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <Input
              ref={organizationRef}
              label="Organization Name"
              placeholder="e.g., Harvard University"
              value={organization}
              onChangeText={setOrganization}
              leftIcon="business-outline"
              returnKeyType="done"
              onSubmitEditing={handleNextStep}
            />

            <Text style={s.orgTypeLabel}>Organization Type</Text>
            <View style={s.orgTypeGrid}>
              {[
                { value: 'university', label: 'University', icon: 'school-outline' as const, color: '#8B5CF6' },
                { value: 'school', label: 'School', icon: 'book-outline' as const, color: '#0EA5E9' },
                { value: 'corporate', label: 'Corporate', icon: 'briefcase-outline' as const, color: '#10B981' },
                { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const, color: '#F59E0B' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[s.orgTypeCard, organizationType === type.value && { borderColor: type.color, backgroundColor: type.color + '10' }]}
                  onPress={() => setOrganizationType(type.value as any)}
                  activeOpacity={0.8}
                >
                  <View style={[s.orgTypeIcon, { backgroundColor: type.color + '15' }]}>
                    <Ionicons name={type.icon} size={20} color={type.color} />
                  </View>
                  <Text style={[s.orgTypeName, organizationType === type.value && { color: type.color, fontWeight: '700' }]}>
                    {type.label}
                  </Text>
                  {organizationType === type.value && (
                    <Ionicons name="checkmark-circle" size={16} color={type.color} style={{ position: 'absolute', top: 6, right: 6 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      <TouchableOpacity onPress={handleNextStep} activeOpacity={0.85} style={s.ctaShadow}>
        <LinearGradient colors={['#0EA5E9', '#0284C7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaButton}>
          <Text style={s.ctaText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // ── Step 3: Role Selection ──────────────────────────────
  const renderStep3 = () => (
    <Animated.View entering={FadeIn.duration(400)} style={s.stepContent}>
      {renderProgress()}

      <View style={s.stepHeader}>
        <View style={[s.stepIconBg, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="people" size={22} color="#F59E0B" />
        </View>
        <Text style={s.stepTitle}>Choose Your Role</Text>
        <Text style={s.stepSubtitle}>Select your primary role</Text>
      </View>

      <View style={s.rolesContainer}>
        {ROLES.map((r, i) => (
          <Animated.View key={r.value} entering={FadeInDown.delay(i * 100).duration(400)}>
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
              {role === r.value && (
                <Animated.View entering={ZoomIn.duration(300)}>
                  <Ionicons name="checkmark-circle" size={24} color={r.color} />
                </Animated.View>
              )}
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <TouchableOpacity onPress={handleNextStep} activeOpacity={0.85} style={s.ctaShadow}>
        <LinearGradient colors={['#0EA5E9', '#0284C7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaButton}>
          <Text style={s.ctaText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // ── Step 4: Credentials ─────────────────────────────────
  const renderStep4 = () => (
    <Animated.View entering={FadeIn.duration(400)} style={s.stepContent}>
      {renderProgress()}

      <View style={s.stepHeader}>
        <View style={[s.stepIconBg, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="lock-closed" size={22} color="#10B981" />
        </View>
        <Text style={s.stepTitle}>Account Credentials</Text>
        <Text style={s.stepSubtitle}>Create your login credentials</Text>
      </View>

      <View style={s.formSection}>
        <Input
          ref={emailRef}
          label="Email Address"
          placeholder="your.email@organization.edu"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail-outline"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Input
          ref={passwordRef}
          label="Password"
          placeholder="Create a strong password"
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
          label="Confirm Password"
          placeholder="Re-enter your password"
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
            <View style={[s.checkbox, item.state && s.checkboxChecked]}>
              {item.state && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={s.checkText}>
              I agree to the <Text style={s.checkLink}>{item.label}</Text>
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setAcceptCompliance(!acceptCompliance)}
          style={s.checkRow}
          activeOpacity={0.7}
        >
          <View style={[s.checkbox, acceptCompliance && s.checkboxChecked]}>
            {acceptCompliance && <Ionicons name="checkmark" size={12} color="#fff" />}
          </View>
          <Text style={s.checkText}>
            I acknowledge data processing per <Text style={s.checkLink}>FERPA</Text> and <Text style={s.checkLink}>GDPR</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Animated.View entering={FadeInDown.duration(300)} style={s.errorContainer}>
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
            <Text style={s.ctaText}>Creating Account...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={[s.ctaText, { marginLeft: 8 }]}>Create Account</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={s.verifyNote}>
        <Ionicons name="mail-outline" size={14} color={Colors.gray[500]} />
        <Text style={s.verifyText}>
          You'll receive a verification email after registration
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={s.container}>
      {/* Premium Background */}
      <LinearGradient
        colors={['#E0F2FE', '#F0F9FF', '#FFFFFF']}
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
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={s.header}>
              <TouchableOpacity
                onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
                style={s.backButton}
              >
                <Ionicons name="chevron-back" size={22} color={Colors.gray[700]} />
              </TouchableOpacity>

              <Text style={s.headerTitle}>Account Setup</Text>
              <View style={s.stepBadge}>
                <Text style={s.stepBadgeText}>{step}/4</Text>
              </View>
            </Animated.View>

            {/* Step Content */}
            <Animated.View entering={FadeInUp.delay(200).duration(500)} style={s.content}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
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
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray[900],
    flex: 1,
    textAlign: 'center',
  },
  stepBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0EA5E9',
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
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
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
    backgroundColor: '#0EA5E9',
  },

  // ── Step Header ───────────────────────────────────────
  stepHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
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

  // ── CTA Button ────────────────────────────────────────
  ctaShadow: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
    borderRadius: 16,
    marginTop: 16,
  },
  ctaButton: {
    height: 52,
    borderRadius: 16,
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
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  roleIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
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
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 6,
  },
  orgTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    borderRadius: 14,
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
    borderRadius: 14,
    marginTop: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  validateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  validatedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
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
    borderRadius: 14,
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
    borderRadius: 12,
  },
  verifyText: {
    fontSize: 12,
    color: Colors.gray[500],
    fontWeight: '500',
  },
});
