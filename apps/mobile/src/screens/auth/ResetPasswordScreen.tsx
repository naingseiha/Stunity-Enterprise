/**
 * Reset Password Screen
 * 
 * Allows users to set a new password using a reset token
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Colors, Spacing } from '@/config';
import { authApi } from '@/api/client';
import { AuthStackScreenProps } from '@/navigation/types';

type NavigationProp = AuthStackScreenProps<'ResetPassword'>['navigation'];
type ResetPasswordRouteProp = RouteProp<{ ResetPassword: { token: string } }, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResetPasswordRouteProp>();
  const token = route.params?.token || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'Must contain an uppercase letter';
    if (!/[a-z]/.test(pw)) return 'Must contain a lowercase letter';
    if (!/[0-9]/.test(pw)) return 'Must contain a number';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Must contain a special character';
    return null;
  };

  const handleSubmit = async () => {
    const pwError = validatePassword(password);
    if (pwError) {
      Alert.alert('Weak Password', pwError);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to reset password. The link may have expired.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View entering={FadeInUp.duration(400)} style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
          </View>
          <Text style={styles.title}>Password Reset!</Text>
          <Text style={styles.subtitle}>
            Your password has been updated. You can now log in with your new password.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>New Password</Text>
          <Text style={styles.subtitle}>
            Create a strong password with at least 8 characters, including uppercase, lowercase, number, and special character.
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm password"
              placeholderTextColor={Colors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
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
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 52,
    width: '100%',
    marginBottom: Spacing.md,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
