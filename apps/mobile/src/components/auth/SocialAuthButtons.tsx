/**
 * Google / Facebook secondary auth capsules for Login & Register flows.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores';
import {
  acquireFacebookAccessToken,
  acquireGoogleIdToken,
  isFacebookAuthConfigured,
  isGoogleAuthConfigured,
} from '@/services/socialAuth';
type Props = {
  disabled?: boolean;
  /** Show the OR divider above the buttons when any provider is available */
  showDivider?: boolean;
};

export default function SocialAuthButtons({ disabled = false, showDivider = true }: Props) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const socialLogin = useAuthStore((s) => s.socialLogin);
  const [busyProvider, setBusyProvider] = useState<'google' | 'facebook' | null>(null);

  const googleEnabled = isGoogleAuthConfigured();
  const facebookEnabled = isFacebookAuthConfigured();

  if (!googleEnabled && !facebookEnabled) {
    return null;
  }

  const runSocial = async (provider: 'google' | 'facebook') => {
    if (disabled || busyProvider) return;
    setBusyProvider(provider);
    try {
      const acquired =
        provider === 'google'
          ? await acquireGoogleIdToken()
          : await acquireFacebookAccessToken();

      if (!acquired.success) {
        if (!acquired.cancelled) {
          Alert.alert(
            t('common.error', 'Error'),
            acquired.error ||
              (provider === 'google'
                ? t('auth.social.googleError', 'Failed to sign in with Google')
                : t('auth.social.facebookError', 'Failed to sign in with Facebook')),
          );
        }
        return;
      }

      const result = await socialLogin(
        provider,
        acquired.provider === 'google'
          ? { idToken: acquired.idToken }
          : { accessToken: acquired.accessToken },
      );

      if (result.requires2FA && result.challengeToken) {
        navigation.navigate('TwoFactor', {
          challengeToken: result.challengeToken,
          email: result.email || '',
        });
        return;
      }

      if (!result.success && !result.cancelled) {
        Alert.alert(
          t('common.error', 'Error'),
          result.error ||
            (provider === 'google'
              ? t('auth.social.googleError', 'Failed to sign in with Google')
              : t('auth.social.facebookError', 'Failed to sign in with Facebook')),
        );
      }
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <View>
      {showDivider && (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>
            {t('auth.social.orContinueWith', 'OR CONTINUE WITH')}
          </Text>
          <View style={styles.dividerLine} />
        </View>
      )}

      {googleEnabled && (
        <TouchableOpacity
          onPress={() => void runSocial('google')}
          disabled={disabled || !!busyProvider}
          style={[styles.secondaryCapsuleCard, (disabled || busyProvider) && styles.disabled]}
          activeOpacity={0.8}
        >
          <View style={[styles.secondaryIconBadge, styles.googleBadge]}>
            {busyProvider === 'google' ? (
              <ActivityIndicator size="small" color="#EA4335" />
            ) : (
              <Ionicons name="logo-google" size={20} color="#EA4335" />
            )}
          </View>
          <Text style={styles.secondaryCardText}>
            {t('auth.social.continueWithGoogle', 'Google')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      )}

      {facebookEnabled && (
        <TouchableOpacity
          onPress={() => void runSocial('facebook')}
          disabled={disabled || !!busyProvider}
          style={[styles.secondaryCapsuleCard, (disabled || busyProvider) && styles.disabled]}
          activeOpacity={0.8}
        >
          <View style={[styles.secondaryIconBadge, styles.facebookBadge]}>
            {busyProvider === 'facebook' ? (
              <ActivityIndicator size="small" color="#1877F2" />
            ) : (
              <Ionicons name="logo-facebook" size={20} color="#1877F2" />
            )}
          </View>
          <Text style={styles.secondaryCardText}>
            {t('auth.social.continueWithFacebook', 'Facebook')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#94A3B8',
  },
  secondaryCapsuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  secondaryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleBadge: {
    borderColor: '#FECACA',
  },
  facebookBadge: {
    borderColor: '#BFDBFE',
  },
  secondaryCardText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  disabled: {
    opacity: 0.6,
  },
});
