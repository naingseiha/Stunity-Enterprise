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

type NavigationProp = AuthStackScreenProps<'Register'>['navigation'];

const ROLES: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { value: 'STUDENT', label: 'Student', icon: 'school-outline', description: 'I want to learn' },
  { value: 'TEACHER', label: 'Educator', icon: 'easel-outline', description: 'I want to teach' },
  { value: 'PARENT', label: 'Parent', icon: 'people-outline', description: 'I\'m a parent' },
];

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const passwordValidation = validatePassword(password);

  const handleNextStep = () => {
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleRegister = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!passwordValidation.isValid) {
      Alert.alert('Weak Password', 'Your password must have: ' + passwordValidation.errors.join(', '));
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!acceptTerms) {
      Alert.alert('Error', 'Please accept the Terms of Service');
      return;
    }

    clearError();
    const success = await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      role,
    });

    if (!success && error) {
      Alert.alert('Registration Failed', error);
    }
  };

  const renderStep1 = () => (
    <Animated.View 
      entering={FadeIn.duration(400)} 
      style={styles.stepContent}
    >
      <Text style={styles.stepTitle}>What's your name?</Text>
      <Text style={styles.stepSubtitle}>Let's get started</Text>
      
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
      <Text style={styles.stepTitle}>I am a...</Text>
      <Text style={styles.stepSubtitle}>Choose your role</Text>
      
      <View style={styles.rolesContainer}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.roleCard, role === r.value && styles.roleCardSelected]}
            onPress={() => setRole(r.value)}
            activeOpacity={0.8}
          >
            <View style={[styles.roleIcon, role === r.value && styles.roleIconSelected]}>
              <Ionicons
                name={r.icon}
                size={24}
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
              <Ionicons name="checkmark-circle" size={24} color="#F59E0B" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleNextStep}
        activeOpacity={0.8}
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
      <Text style={styles.stepTitle}>Create your account</Text>
      <Text style={styles.stepSubtitle}>Final step</Text>
      
      <View style={styles.formContainer}>
        <Input
          ref={emailRef}
          label="Email"
          placeholder="Enter your email"
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
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon="lock-closed-outline"
          showPasswordToggle
          hint={password ? (passwordValidation.isValid ? '✓ Strong password' : passwordValidation.errors[0]) : undefined}
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
        />
        
        <Input
          ref={confirmPasswordRef}
          label="Confirm Password"
          placeholder="Confirm your password"
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

      {/* Terms */}
      <TouchableOpacity
        onPress={() => setAcceptTerms(!acceptTerms)}
        style={styles.termsRow}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
          {acceptTerms && (
            <Ionicons name="checkmark" size={14} color={Colors.white} />
          )}
        </View>
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleRegister}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.continueButton}
        >
          <Text style={styles.continueButtonText}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
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
              >
                <Ionicons name="arrow-back" size={22} color={Colors.gray[700]} />
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>Profile Setup</Text>
              <Text style={styles.stepIndicator}>0{step} of 03</Text>
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
    fontWeight: '600',
    color: Colors.gray[900],
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    fontSize: Typography.fontSize.sm,
    color: '#F59E0B',
    fontWeight: '500',
  },
  content: {
    paddingTop: Spacing[4],
  },
  stepContent: {
    flex: 1,
  },
  stepSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    marginBottom: Spacing[6],
  },
  formContainer: {
    marginBottom: Spacing[6],
  },
  stepTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: Spacing[2],
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
  continueButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[6],
  },
  continueButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Typography.fontSize.base,
  },
  rolesContainer: {
    gap: Spacing[4],
    marginBottom: Spacing[6],
  },
  roleCard: {
    padding: Spacing[4],
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  roleIconSelected: {
    backgroundColor: '#F59E0B',
  },
  roleInfo: {
    flex: 1,
  },
  roleLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 2,
  },
  roleLabelSelected: {
    color: '#F59E0B',
  },
  roleDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing[6],
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
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
});
