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
  Alert, Animated} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';


import { Colors, Spacing } from '@/config';
import { authApi } from '@/api/client';
import { AuthStackScreenProps } from '@/navigation/types';
import { useTranslation } from 'react-i18next';

type NavigationProp = AuthStackScreenProps<'ResetPassword'>['navigation'];
type ResetPasswordRouteProp = RouteProp<{ ResetPassword: { token: string } }, 'ResetPassword'>;

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResetPasswordRouteProp>();
  const token = route.params?.token || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return t('auth.reset.passwordMin8');
    if (!/[A-Z]/.test(pw)) return t('auth.reset.passwordNeedUpper');
    if (!/[a-z]/.test(pw)) return t('auth.reset.passwordNeedLower');
    if (!/[0-9]/.test(pw)) return t('auth.reset.passwordNeedNumber');
    if (!/[^A-Za-z0-9]/.test(pw)) return t('auth.reset.passwordNeedSpecial');
    return null;
  };

  const handleSubmit = async () => {
    const pwError = validatePassword(password);
    if (pwError) {
      Alert.alert(t('auth.reset.weakPasswordTitle'), pwError);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.reset.passwordsNotMatch'));
      return;
    }

    setLoading(true);
    try {
      await authApi.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (error: any) {
      const msg = error.response?.data?.error || t('auth.reset.failedReset');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
          </View>
          <Text style={styles.title}>{t('auth.reset.successTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.reset.successSubtitle')}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>{t('auth.reset.goToLogin')}</Text>
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
        <Animated.View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>{t('auth.reset.newPasswordTitle')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.reset.newPasswordSubtitle')}
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('auth.reset.newPasswordPlaceholder')}
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
              placeholder={t('auth.reset.confirmPasswordPlaceholder')}
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
              {loading ? t('auth.reset.resetting') : t('auth.reset.resetPassword')}
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
