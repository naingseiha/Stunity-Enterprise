/**
 * Parent Login Screen
 *
 * Phone + password login for parents
 * Calls POST /auth/parent/login
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
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Colors, Typography, Spacing } from '@/config';
import { useAuthStore } from '@/stores';

export default function ParentLoginScreen() {
  const navigation = useNavigation<any>();
  const { parentLogin, isLoading, error, clearError } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    clearError();
    const success = await parentLogin({
      phone: phone.trim(),
      password,
    });

    if (!success && error) {
      Alert.alert('Login Failed', error);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ECFDF5', '#D1FAE5', '#FFFFFF']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header — back button matches Register/Login standard */}
            <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={22} color={Colors.gray[700]} />
              </TouchableOpacity>
              <View style={styles.titleRow}>
                <View style={[styles.iconWrap, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="people" size={28} color="#059669" />
                </View>
                <Text style={styles.title}>Parent Portal</Text>
                <Text style={styles.subtitle}>{"Track your child's grades and attendance"}</Text>
              </View>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 012345678"
                  placeholderTextColor={Colors.gray[400]}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  editable={!isLoading}
                />
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={Colors.gray[400]}
                  style={styles.inputIcon}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.gray[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Colors.gray[400]}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
                style={styles.submitButton}
              >
                <LinearGradient
                  colors={['#059669', '#047857']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {isLoading ? (
                    <Text style={styles.submitText}>Signing in...</Text>
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.submitText}>Sign In</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.switchLink}
                disabled={isLoading}
              >
                <Text style={styles.switchText}>
                  Student or Teacher? <Text style={styles.switchTextBold}>Sign in with email</Text>
                </Text>
              </TouchableOpacity>
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
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  header: {
    marginBottom: Spacing.xl * 2,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleRow: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
    color: Colors.gray[900],
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.gray[600],
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.caption,
    color: Colors.gray[600],
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 48,
    fontSize: 16,
    color: Colors.gray[900],
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 40,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 38,
    padding: 8,
  },
  submitButton: {
    marginTop: Spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: Spacing.lg,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  switchLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  switchTextBold: {
    color: '#059669',
    fontWeight: '600',
  },
});
