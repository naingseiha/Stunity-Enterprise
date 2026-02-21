/**
 * Two-Factor Authentication Screen
 * 
 * Handles 2FA verification during login flow
 */

import React, { useState, useRef, useEffect } from 'react';
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

type TwoFactorParams = {
  TwoFactor: {
    tempToken: string;
    email: string;
  };
};

export default function TwoFactorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<TwoFactorParams, 'TwoFactor'>>();
  const { tempToken, email } = route.params || { tempToken: '', email: '' };

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Auto-focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste — distribute digits across inputs
      const digits = text.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIdx = Math.min(index + digits.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = text.replace(/\D/g, '');
    setCode(newCode);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handleVerify = async () => {
    const totpCode = useBackupCode ? backupCode.trim() : code.join('');
    if (!useBackupCode && totpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }
    if (useBackupCode && !totpCode) {
      Alert.alert('Error', 'Please enter a backup code');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.post('/auth/2fa/verify', {
        tempToken,
        code: totpCode,
        isBackupCode: useBackupCode,
      });

      if (response.data?.success) {
        // 2FA verified — the response contains final tokens
        // Navigate to main app (auth store handles token storage)
        Alert.alert('Success', 'Authentication complete');
        // The login flow in authStore should handle storing tokens and navigating
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Invalid code. Please try again.';
      Alert.alert('Verification Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Two-Factor Authentication</Text>
          <Text style={styles.subtitle}>
            {useBackupCode
              ? 'Enter one of your backup codes'
              : `Enter the 6-digit code from your authenticator app for ${email}`}
          </Text>

          {!useBackupCode ? (
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={6}
                  selectTextOnFocus
                />
              ))}
            </View>
          ) : (
            <View style={styles.backupInputContainer}>
              <TextInput
                style={styles.backupInput}
                placeholder="Enter backup code"
                placeholderTextColor={Colors.textTertiary}
                value={backupCode}
                onChangeText={setBackupCode}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleVerify}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Verifying...' : 'Verify'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setUseBackupCode(!useBackupCode);
              setCode(['', '', '', '', '', '']);
              setBackupCode('');
            }}
          >
            <Text style={styles.switchButtonText}>
              {useBackupCode ? 'Use authenticator app instead' : 'Use a backup code'}
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
    paddingHorizontal: Spacing.md,
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
    paddingHorizontal: Spacing.sm,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.gray[50],
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.text,
  },
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  backupInputContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  backupInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.gray[50],
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchButton: {
    marginTop: Spacing.lg,
    padding: Spacing.sm,
  },
  switchButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});
