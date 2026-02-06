/**
 * Register Screen
 * 
 * User registration with role selection
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { Button, Input } from '@/components/common';
import { Colors, Typography, Spacing, BorderRadius } from '@/config';
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
    <Animated.View entering={FadeInRight.duration(400)} style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your name?</Text>
      <Text style={styles.stepSubtitle}>Let's start with the basics</Text>
      
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

      <Button
        title="Continue"
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleNextStep}
        gradient
        style={styles.continueButton}
      />
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View entering={FadeInRight.duration(400)} style={styles.stepContent}>
      <Text style={styles.stepTitle}>I am a...</Text>
      <Text style={styles.stepSubtitle}>Choose your role on Stunity</Text>
      
      <View style={styles.rolesContainer}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.roleCard, role === r.value && styles.roleCardSelected]}
            onPress={() => setRole(r.value)}
          >
            <View style={[styles.roleIcon, role === r.value && styles.roleIconSelected]}>
              <Ionicons
                name={r.icon}
                size={28}
                color={role === r.value ? Colors.white : Colors.primary[500]}
              />
            </View>
            <Text style={[styles.roleLabel, role === r.value && styles.roleLabelSelected]}>
              {r.label}
            </Text>
            <Text style={styles.roleDescription}>{r.description}</Text>
            {role === r.value && (
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary[500]} />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Button
        title="Continue"
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleNextStep}
        gradient
        style={styles.continueButton}
      />
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeInRight.duration(400)} style={styles.stepContent}>
      <Text style={styles.stepTitle}>Create your account</Text>
      <Text style={styles.stepSubtitle}>Almost there! Set up your credentials</Text>
      
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
        error={password && !passwordValidation.isValid ? undefined : undefined}
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

      {/* Terms */}
      <TouchableOpacity
        onPress={() => setAcceptTerms(!acceptTerms)}
        style={styles.termsRow}
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

      <Button
        title="Create Account"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        onPress={handleRegister}
        gradient
        style={styles.continueButton}
      />
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
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
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.gray[700]} />
            </TouchableOpacity>
            
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              {[1, 2, 3].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.progressDot,
                    s <= step && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
            
            <View style={styles.placeholder} />
          </View>

          {/* Step Content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text
                style={styles.footerLink}
                onPress={() => navigation.navigate('Login')}
              >
                Sign In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing[6],
    paddingBottom: Spacing[6],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing[2],
    marginBottom: Spacing[6],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gray[200],
  },
  progressDotActive: {
    backgroundColor: Colors.primary[500],
    width: 24,
  },
  placeholder: {
    width: 44,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: Spacing[2],
  },
  stepSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[500],
    marginBottom: Spacing[6],
  },
  continueButton: {
    marginTop: Spacing[4],
  },
  rolesContainer: {
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  roleCard: {
    padding: Spacing[4],
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: Colors.primary[500],
    backgroundColor: Colors.primary[50],
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[4],
  },
  roleIconSelected: {
    backgroundColor: Colors.primary[500],
  },
  roleLabel: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  roleLabelSelected: {
    color: Colors.primary[700],
  },
  roleDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[500],
    position: 'absolute',
    left: 76,
    top: 38,
  },
  checkIcon: {
    position: 'absolute',
    right: Spacing[4],
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing[4],
    marginBottom: Spacing[2],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  termsText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.gray[600],
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.primary[500],
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing[6],
  },
  footerText: {
    fontSize: Typography.fontSize.base,
    color: Colors.gray[600],
  },
  footerLink: {
    color: Colors.primary[500],
    fontWeight: '600',
  },
});
