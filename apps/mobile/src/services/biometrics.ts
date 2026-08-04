import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export type BiometricAuthResult = {
  success: boolean;
  cancelled?: boolean;
  error?: string;
};

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    return LocalAuthentication.isEnrolledAsync();
  } catch {
    return false;
  }
}

export async function getBiometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
  } catch {
    // Fall through to generic label.
  }
  return 'Biometrics';
}

export async function authenticateBiometric(
  promptMessage = 'Authenticate to continue'
): Promise<BiometricAuthResult> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device.',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: Platform.OS === 'ios' ? 'Use Passcode' : 'Use PIN',
    });

    if (result.success) {
      return { success: true };
    }

    if (result.error === 'user_cancel' || result.error === 'system_cancel') {
      return { success: false, cancelled: true };
    }

    return {
      success: false,
      error: result.error || 'Authentication failed.',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Authentication failed.',
    };
  }
}
