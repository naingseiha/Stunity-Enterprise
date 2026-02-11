/**
 * Register Screen
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
  FadeIn,
} from 'react-native-reanimated';

import { Button, Input } from '@/components/common';
import { Colors, Typography, Spacing } from '@/config';
import { useAuthStore } from '@/stores';
import { AuthStackScreenProps } from '@/navigation/types';
import { UserRole } from '@/types';
import { validatePassword } from '@/utils';
import { authApi } from '@/api/client';

type NavigationProp = AuthStackScreenProps<'Register'>['navigation'];

const ROLES: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { value: 'STUDENT', label: 'Student', icon: 'school-outline', description: 'I want to learn' },
  { value: 'TEACHER', label: 'Educator', icon: 'easel-outline', description: 'I want to teach' },
  { value: 'PARENT', label: 'Parent', icon: 'people-outline', description: 'I\'m a parent' },
];

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
        
        // Auto-fill organization details
        setOrganization(data.school.name);
        
        // Map school type to organization type
        const schoolTypeMap: Record<string, any> = {
          'PRIMARY_SCHOOL': 'school',
          'SECONDARY_SCHOOL': 'school',
          'HIGH_SCHOOL': 'school',
          'UNIVERSITY': 'university',
          'INTERNATIONAL': 'school',
        };
        setOrganizationType(schoolTypeMap[data.school.schoolType] || 'school');
        
        // Auto-set role based on claim code type
        if (data.type === 'STUDENT') {
          setRole('STUDENT');
        } else if (data.type === 'TEACHER') {
          setRole('TEACHER');
        }
        
        Alert.alert(
          'Claim Code Validated',
          `Successfully linked to ${data.school.name}`,
          [{ text: 'Continue', style: 'default' }]
        );
      } else {
        Alert.alert('Invalid Claim Code', response.data.error || response.data.message || 'Please check your code and try again');
        setClaimCodeValidated(false);
        setClaimCodeData(null);
      }
    } catch (error: any) {
      const message = error?.message || 'Unable to validate claim code. Please check your connection.';
      Alert.alert('Connection Error', message);
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
          Alert.alert('Claim Code Required', 'Please validate your claim code first');
          return;
        }
      } else {
        if (!organization.trim()) {
          Alert.alert('Required', 'Please enter your organization or institution name');
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
      Alert.alert('Required', 'Please accept all terms and policies to continue');
      return;
    }

    clearError();
    
    // If using claim code, call the special register endpoint
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
          const { user, tokens } = response.data.data || response.data;
          
          // Store tokens using token service (via authStore)
          const loginSuccess = await login({
            email: email.trim(),
            password,
            rememberMe: true,
          });
          
          if (loginSuccess) {
            Alert.alert(
              'Account Created',
              `Welcome to ${claimCodeData.school.name}! Your account has been linked successfully.`,
              [{ text: 'Get Started' }]
            );
          }
        } else {
          Alert.alert('Registration Failed', response.data.error || response.data.message || 'Unable to create account with claim code');
        }
      } catch (error: any) {
        const message = error?.message || 'Unable to complete registration. Please try again.';
        Alert.alert('Connection Error', message);
      }
      return;
    }
    
    // Regular registration without claim code
    const success = await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      role,
      organization: organization.trim() || undefined,
      organizationType: organizationType,
    });

    if (success) {
      Alert.alert(
        'Account Created', 
        'Your account has been created successfully.',
        [{ text: 'Get Started' }]
      );
    } else if (error) {
      Alert.alert('Registration Failed', error);
    }
  };

  const renderStep1 = () => (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      style={styles.stepContent}
    >
      <View style={styles.headerProgress}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map((s) => (
            <View 
              key={s} 
              style={[
                styles.progressDot, 
                s <= step && styles.progressDotActive,
                s < step && styles.progressDotComplete
              ]} 
            />
          ))}
        </View>
      </View>

      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepSubtitle}>Please provide your name</Text>
      
      <View style={styles.formContainer}>
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

      <TouchableOpacity
        onPress={handleNextStep}
        activeOpacity={0.8}
        accessibilityLabel="Continue to next step"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      style={styles.stepContent}
    >
      <View style={styles.headerProgress}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map((s) => (
            <View 
              key={s} 
              style={[
                styles.progressDot, 
                s <= step && styles.progressDotActive,
                s < step && styles.progressDotComplete
              ]} 
            />
          ))}
        </View>
      </View>

      <Text style={styles.stepTitle}>Organization</Text>
      <Text style={styles.stepSubtitle}>Specify your institution or use a claim code</Text>
      
      {/* Claim Code Toggle */}
      <TouchableOpacity
        style={styles.claimCodeToggle}
        onPress={() => {
          setUseClaimCode(!useClaimCode);
          setClaimCodeValidated(false);
          setClaimCodeData(null);
          setClaimCode('');
        }}
        activeOpacity={0.7}
      >
        <View style={styles.claimCodeToggleContent}>
          <Ionicons 
            name={useClaimCode ? "checkmark-circle" : "radio-button-off-outline"} 
            size={22} 
            color={useClaimCode ? "#F59E0B" : Colors.gray[400]} 
          />
          <Text style={[styles.claimCodeToggleText, useClaimCode && styles.claimCodeToggleTextActive]}>
            I have a school claim code
          </Text>
        </View>
        <Ionicons name="information-circle-outline" size={18} color={Colors.gray[400]} />
      </TouchableOpacity>
      
      <View style={styles.formContainer}>
        {useClaimCode ? (
          // Claim Code Input
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
              style={claimCodeValidated ? styles.inputDisabled : undefined}
            />
            
            {claimCodeValidated && claimCodeData && (
              <Animated.View 
                entering={FadeIn.duration(300)}
                style={styles.validatedCard}
              >
                <View style={styles.validatedHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  <Text style={styles.validatedTitle}>Validated Successfully</Text>
                </View>
                <View style={styles.validatedInfo}>
                  <Text style={styles.validatedLabel}>School:</Text>
                  <Text style={styles.validatedValue}>{claimCodeData.school.name}</Text>
                </View>
                {claimCodeData.student && (
                  <View style={styles.validatedInfo}>
                    <Text style={styles.validatedLabel}>Student:</Text>
                    <Text style={styles.validatedValue}>
                      {claimCodeData.student.firstName} {claimCodeData.student.lastName}
                    </Text>
                  </View>
                )}
                {claimCodeData.teacher && (
                  <View style={styles.validatedInfo}>
                    <Text style={styles.validatedLabel}>Teacher:</Text>
                    <Text style={styles.validatedValue}>
                      {claimCodeData.teacher.firstName} {claimCodeData.teacher.lastName}
                    </Text>
                  </View>
                )}
              </Animated.View>
            )}
            
            {!claimCodeValidated && (
              <TouchableOpacity
                style={[styles.validateButton, validatingCode && styles.validateButtonDisabled]}
                onPress={handleValidateClaimCode}
                disabled={validatingCode || !claimCode.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.validateButtonText}>
                  {validatingCode ? 'Validating...' : 'Validate Claim Code'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          // Manual Organization Input
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
            
            <Text style={styles.label}>Organization Type</Text>
            <View style={styles.typeContainer}>
              {[
                { value: 'university', label: 'University', icon: 'school-outline' },
                { value: 'school', label: 'School', icon: 'book-outline' },
                { value: 'corporate', label: 'Corporate', icon: 'briefcase-outline' },
                { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
              ].map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[styles.typeCard, organizationType === type.value && styles.typeCardSelected]}
                  onPress={() => setOrganizationType(type.value as any)}
                  activeOpacity={0.8}
                  accessibilityLabel={`Select ${type.label}`}
                  accessibilityRole="button"
                >
                  <View style={[styles.typeIconContainer, organizationType === type.value && styles.typeIconContainerSelected]}>
                    <Ionicons
                      name={type.icon as any}
                      size={22}
                      color={organizationType === type.value ? '#F59E0B' : Colors.gray[600]}
                    />
                  </View>
                  <Text style={[styles.typeLabel, organizationType === type.value && styles.typeLabelSelected]}>
                    {type.label}
                  </Text>
                  {organizationType === type.value && (
                    <Ionicons name="checkmark-circle" size={18} color="#F59E0B" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </View>

      <TouchableOpacity
        onPress={handleNextStep}
        activeOpacity={0.8}
        accessibilityLabel="Continue to next step"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      style={styles.stepContent}
    >
      <View style={styles.headerProgress}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map((s) => (
            <View 
              key={s} 
              style={[
                styles.progressDot, 
                s <= step && styles.progressDotActive,
                s < step && styles.progressDotComplete
              ]} 
            />
          ))}
        </View>
      </View>

      <Text style={styles.stepTitle}>Role Selection</Text>
      <Text style={styles.stepSubtitle}>Choose your primary role</Text>
      
      <View style={styles.rolesContainer}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.roleCard, role === r.value && styles.roleCardSelected]}
            onPress={() => setRole(r.value)}
            activeOpacity={0.8}
            accessibilityLabel={`Select role: ${r.label}`}
            accessibilityRole="button"
          >
            <View style={[styles.roleIcon, role === r.value && styles.roleIconSelected]}>
              <Ionicons
                name={r.icon}
                size={26}
                color={role === r.value ? Colors.white : '#F59E0B'}
              />
            </View>
            <View style={styles.roleInfo}>
              <Text style={[styles.roleLabel, role === r.value && styles.roleLabelSelected]}>
                {r.label}
              </Text>
              <Text style={styles.roleDescription}>
                {r.description}
              </Text>
            </View>
            {role === r.value && (
              <View style={styles.roleCheckContainer}>
                <Ionicons name="checkmark-circle" size={26} color="#F59E0B" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleNextStep}
        activeOpacity={0.8}
        accessibilityLabel="Continue to next step"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      style={styles.stepContent}
    >
      <View style={styles.headerProgress}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map((s) => (
            <View 
              key={s} 
              style={[
                styles.progressDot, 
                s <= step && styles.progressDotActive,
                s < step && styles.progressDotComplete
              ]} 
            />
          ))}
        </View>
      </View>

      <Text style={styles.stepTitle}>Account Credentials</Text>
      <Text style={styles.stepSubtitle}>Create your login credentials</Text>
      
      <View style={styles.formContainer}>
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

      {/* Compliance Checkboxes */}
      <View style={styles.complianceContainer}>
        <TouchableOpacity
          onPress={() => setAcceptTerms(!acceptTerms)}
          style={styles.termsRow}
          activeOpacity={0.7}
          accessibilityLabel="Accept Terms of Service"
          accessibilityRole="checkbox"
        >
          <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
            {acceptTerms && (
              <Ionicons name="checkmark" size={14} color={Colors.white} />
            )}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setAcceptPrivacy(!acceptPrivacy)}
          style={styles.termsRow}
          activeOpacity={0.7}
          accessibilityLabel="Accept Privacy Policy"
          accessibilityRole="checkbox"
        >
          <View style={[styles.checkbox, acceptPrivacy && styles.checkboxChecked]}>
            {acceptPrivacy && (
              <Ionicons name="checkmark" size={14} color={Colors.white} />
            )}
          </View>
          <Text style={styles.termsText}>
            I agree to the{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setAcceptCompliance(!acceptCompliance)}
          style={styles.termsRow}
          activeOpacity={0.7}
          accessibilityLabel="Accept Data Compliance"
          accessibilityRole="checkbox"
        >
          <View style={[styles.checkbox, acceptCompliance && styles.checkboxChecked]}>
            {acceptCompliance && (
              <Ionicons name="checkmark" size={14} color={Colors.white} />
            )}
          </View>
          <Text style={styles.termsText}>
            I acknowledge the processing of my educational data in compliance with{' '}
            <Text style={styles.termsLink}>FERPA</Text> and{' '}
            <Text style={styles.termsLink}>GDPR</Text>
          </Text>
        </TouchableOpacity>
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

      <TouchableOpacity
        onPress={handleRegister}
        disabled={isLoading}
        activeOpacity={0.8}
        accessibilityLabel="Create account"
        accessibilityRole="button"
        style={styles.continueButtonShadow}
      >
        <LinearGradient
          colors={isLoading ? ['#9CA3AF', '#6B7280'] : ['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueButton}
        >
          {isLoading ? (
            <Text style={styles.continueButtonText}>Creating Account...</Text>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} style={styles.arrowIcon} />
              <Text style={styles.continueButtonText}>Create Account</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.verificationContainer}>
        <Ionicons name="mail" size={16} color={Colors.gray[500]} />
        <Text style={styles.verificationNote}>
          You will receive an email to verify your account after registration
        </Text>
      </View>
    </Animated.View>
  );

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
            {/* Header */}
            <Animated.View 
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.header}
            >
              <TouchableOpacity
                onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
                style={styles.backButton}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <Ionicons name="arrow-back" size={22} color={Colors.gray[700]} />
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>Account Setup</Text>
              <Text style={styles.stepIndicator}>0{step} of 04</Text>
            </Animated.View>

            {/* Content */}
            <Animated.View 
              entering={FadeInUp.delay(200).duration(500)}
              style={styles.content}
            >
              {/* Step Content */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[6],
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.gray[900],
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  stepIndicator: {
    fontSize: Typography.fontSize.sm,
    color: '#F59E0B',
    fontWeight: '700',
  },
  content: {
    paddingTop: Spacing[4],
  },
  stepContent: {
    flex: 1,
  },
  headerProgress: {
    alignItems: 'center',
    marginBottom: Spacing[8],
  },
  progressBar: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  progressDot: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gray[200],
  },
  progressDotActive: {
    backgroundColor: '#FDE68A',
  },
  progressDotComplete: {
    backgroundColor: '#F59E0B',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: Spacing[2],
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
    marginBottom: Spacing[6],
    lineHeight: 22,
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
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: Spacing[4],
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.gray[900],
  },
  inputIcon: {
    marginLeft: Spacing[2],
  },
  formContainer: {
    marginBottom: Spacing[6],
  },
  continueButton: {
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: Spacing[6],
  },
  continueButtonShadow: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 30,
  },
  continueButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: Typography.fontSize.lg,
    letterSpacing: 0.5,
  },
  arrowIcon: {
    marginLeft: Spacing[2],
  },
  rolesContainer: {
    gap: Spacing[4],
    marginBottom: Spacing[6],
  },
  roleCard: {
    padding: Spacing[5],
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roleCardSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.2,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[4],
  },
  roleIconSelected: {
    backgroundColor: '#F59E0B',
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 4,
  },
  roleLabelSelected: {
    color: Colors.gray[900],
  },
  roleDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
  },
  roleCheckContainer: {
    marginLeft: Spacing[2],
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing[6],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  termsText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  termsLink: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing[4],
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    backgroundColor: Colors.white,
    alignItems: 'center',
    gap: Spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  typeCardSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.15,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconContainerSelected: {
    backgroundColor: Colors.white,
  },
  typeLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  typeLabelSelected: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  complianceContainer: {
    gap: Spacing[3],
    marginBottom: Spacing[5],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: Spacing[4],
    borderRadius: 28,
    marginBottom: Spacing[4],
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
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    marginTop: Spacing[4],
    padding: Spacing[3],
    backgroundColor: Colors.gray[50],
    borderRadius: 28,
  },
  verificationNote: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[600],
    lineHeight: 18,
    fontWeight: '500',
  },
  // Claim Code Styles
  claimCodeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing[4],
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    marginBottom: Spacing[4],
  },
  claimCodeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  claimCodeToggleText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    fontWeight: '600',
  },
  claimCodeToggleTextActive: {
    color: '#F59E0B',
  },
  validateButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: Spacing[4],
    borderRadius: 28,
    alignItems: 'center',
    marginTop: Spacing[3],
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  validateButtonDisabled: {
    opacity: 0.5,
  },
  validateButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  validatedCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: Spacing[4],
    marginTop: Spacing[3],
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  validatedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  validatedTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: '700',
    color: '#10B981',
  },
  validatedInfo: {
    marginTop: Spacing[2],
  },
  validatedLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.gray[600],
    fontWeight: '600',
    marginBottom: Spacing[1],
  },
  validatedValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[900],
    fontWeight: '600',
  },
  inputDisabled: {
    backgroundColor: Colors.gray[100],
    opacity: 0.7,
  },
});
