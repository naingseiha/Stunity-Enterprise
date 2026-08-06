/**
 * Social auth — clean horizontal circle logos (Google, Facebook, optional Telegram/Passkey).
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
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores';
import {
  acquireFacebookAccessToken,
  acquireGoogleIdToken,
  isFacebookAuthConfigured,
  isGoogleAuthConfigured,
} from '@/services/socialAuth';

type ExtraProvider = {
  onPress: () => void | Promise<void>;
  loading?: boolean;
};

type Props = {
  disabled?: boolean;
  showDivider?: boolean;
  dividerLabel?: string;
  telegram?: ExtraProvider | false;
  passkey?: ExtraProvider | false;
};

function GoogleMark({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

type CircleProvider = {
  key: string;
  accessibilityLabel: string;
  loading: boolean;
  onPress: () => void;
  renderIcon: () => React.ReactNode;
};

export default function SocialAuthButtons({
  disabled = false,
  showDivider = true,
  dividerLabel,
  telegram,
  passkey,
}: Props) {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const socialLogin = useAuthStore((s) => s.socialLogin);
  const [busyProvider, setBusyProvider] = useState<'google' | 'facebook' | null>(null);

  const googleEnabled = isGoogleAuthConfigured();
  const facebookEnabled = isFacebookAuthConfigured();

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

  const providers: CircleProvider[] = [];

  if (googleEnabled) {
    providers.push({
      key: 'google',
      accessibilityLabel: t('auth.social.continueWithGoogle', 'Continue with Google'),
      loading: busyProvider === 'google',
      onPress: () => void runSocial('google'),
      renderIcon: () => <GoogleMark size={22} />,
    });
  }

  if (facebookEnabled) {
    providers.push({
      key: 'facebook',
      accessibilityLabel: t('auth.social.continueWithFacebook', 'Continue with Facebook'),
      loading: busyProvider === 'facebook',
      onPress: () => void runSocial('facebook'),
      renderIcon: () => <Ionicons name="logo-facebook" size={24} color="#1877F2" />,
    });
  }

  if (telegram) {
    providers.push({
      key: 'telegram',
      accessibilityLabel: t('auth.passwordless.continueWithTelegram', 'Continue with Telegram'),
      loading: !!telegram.loading,
      onPress: () => void telegram.onPress(),
      renderIcon: () => <Ionicons name="paper-plane" size={20} color="#2AABEE" />,
    });
  }

  if (passkey) {
    providers.push({
      key: 'passkey',
      accessibilityLabel: t('auth.passwordless.usePasskey', 'Use Passkey'),
      loading: !!passkey.loading,
      onPress: () => void passkey.onPress(),
      renderIcon: () => <Ionicons name="finger-print" size={22} color="#0F172A" />,
    });
  }

  if (providers.length === 0) {
    return null;
  }

  const busy = disabled || !!busyProvider;

  return (
    <View style={styles.wrap}>
      {showDivider && (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>
            {dividerLabel || t('auth.social.orContinueWith', 'or continue with')}
          </Text>
          <View style={styles.dividerLine} />
        </View>
      )}

      <View style={styles.row}>
        {providers.map((provider) => (
          <TouchableOpacity
            key={provider.key}
            onPress={provider.onPress}
            disabled={busy || provider.loading}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={provider.accessibilityLabel}
            style={[styles.circleBtn, (busy || provider.loading) && styles.disabled]}
          >
            {provider.loading ? (
              <ActivityIndicator size="small" color="#64748B" />
            ) : (
              provider.renderIcon()
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    color: '#94A3B8',
    textTransform: 'lowercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 2,
  },
  circleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  disabled: {
    opacity: 0.55,
  },
});
