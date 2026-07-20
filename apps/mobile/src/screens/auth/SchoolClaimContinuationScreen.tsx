import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores';
import {
  clearPendingSchoolClaim,
  getPendingSchoolClaim,
  savePendingSchoolClaim,
} from '@/services/pendingSchoolClaim';

type ClaimRouteParams = {
  claimCode?: string;
  code?: string;
};

type ClaimPreview = {
  type?: string;
  school?: { name?: string };
  student?: { maskedName?: string; className?: string; gradeLevel?: string };
  teacher?: { maskedName?: string };
};

export default function SchoolClaimContinuationScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const validateClaimCode = useAuthStore((state) => state.validateClaimCode);
  const linkClaimCode = useAuthStore((state) => state.linkClaimCode);
  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const validatedCodeRef = useRef<string | null>(null);

  const goHome = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', { screen: 'Welcome' });
      return;
    }
    navigation.navigate(user?.role === 'PARENT' ? 'Parent' : 'Main');
  };

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      const params = (route.params || {}) as ClaimRouteParams;
      const incoming = params.claimCode || params.code;
      const pending = incoming
        ? await savePendingSchoolClaim(incoming)
        : await getPendingSchoolClaim();

      if (!active) return;
      if (!pending) {
        setError(t('auth.schoolClaim.invalidOrExpired'));
        return;
      }

      setClaimCode(pending.code);
      if (!isAuthenticated) {
        navigation.replace('Auth', { screen: 'Register' });
      } else if (user?.isDefaultPassword) {
        navigation.replace('ForceChangePassword');
      }
    };
    void prepare();
    return () => {
      active = false;
    };
  }, [isAuthenticated, navigation, route.params, t, user?.isDefaultPassword]);

  useEffect(() => {
    if (!isAuthenticated || !claimCode || validatedCodeRef.current === claimCode) return;
    validatedCodeRef.current = claimCode;
    let active = true;
    const loadPreview = async () => {
      setError(null);
      const result = await validateClaimCode(claimCode);
      if (!active) return;
      if (!result.success || !result.data) {
        setError(result.error || t('auth.schoolClaim.previewFailed'));
        return;
      }
      setPreview(result.data as ClaimPreview);
    };
    void loadPreview();
    return () => {
      active = false;
    };
  }, [claimCode, isAuthenticated, retryNonce, t, validateClaimCode]);

  const cancel = async () => {
    await clearPendingSchoolClaim();
    goHome();
  };

  const retry = () => {
    if (!claimCode) return;
    validatedCodeRef.current = null;
    setError(null);
    setRetryNonce((current) => current + 1);
  };

  const submit = async () => {
    if (!claimCode || !preview) return;
    const result = await linkClaimCode(claimCode);
    if (!result.success) {
      Alert.alert(t('common.error'), result.error || t('auth.schoolClaim.submitFailed'));
      return;
    }
    await clearPendingSchoolClaim();
    setSuccess(true);
  };

  const maskedName = preview?.student?.maskedName || preview?.teacher?.maskedName;
  const classLabel = preview?.student?.className || preview?.student?.gradeLevel;
  const roleLabel = preview?.type
    ? t(`auth.schoolClaim.roles.${preview.type.toLowerCase()}`, { defaultValue: preview.type })
    : null;

  if (!preview && !error) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0284C7" />
        <Text style={styles.loadingText}>{t('auth.schoolClaim.preparing')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconCircle, success && styles.successCircle]}>
          <Ionicons name={success ? 'checkmark-circle-outline' : 'school-outline'} size={34} color={success ? '#047857' : '#0284C7'} />
        </View>

        <Text style={styles.title}>{t(success ? 'auth.schoolClaim.successTitle' : 'auth.schoolClaim.title')}</Text>
        <Text style={styles.subtitle}>{t(success ? 'auth.schoolClaim.successBody' : 'auth.schoolClaim.subtitle')}</Text>

        {error ? (
          <View style={styles.errorCard} accessibilityLiveRegion="assertive">
            <Text style={styles.errorText}>{error}</Text>
            {claimCode && (
              <TouchableOpacity onPress={retry} accessibilityRole="button" style={styles.retryButton}>
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : preview && !success ? (
          <View style={styles.previewCard}>
            <PreviewRow label={t('auth.schoolClaim.school')} value={preview.school?.name || t('auth.schoolClaim.unknownSchool')} />
            {roleLabel && <PreviewRow label={t('auth.schoolClaim.role')} value={roleLabel} />}
            {maskedName && <PreviewRow label={t('auth.schoolClaim.profile')} value={maskedName} />}
            {classLabel && <PreviewRow label={t('auth.schoolClaim.class')} value={classLabel} />}
          </View>
        ) : null}

        {success ? (
          <TouchableOpacity onPress={goHome} accessibilityRole="button" style={styles.primaryButton}>
            <Text style={styles.primaryText}>{t('auth.schoolClaim.continue')}</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => void submit()}
              disabled={!preview || isLoading}
              accessibilityRole="button"
              accessibilityState={{ disabled: !preview || isLoading, busy: isLoading }}
              style={[styles.primaryButton, (!preview || isLoading) && styles.disabledButton]}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{t('auth.schoolClaim.confirm')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void cancel()} accessibilityRole="button" style={styles.cancelButton}>
              <Text style={styles.cancelText}>{t('auth.schoolClaim.cancel')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={styles.previewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', padding: 28 },
  loadingText: { marginTop: 16, color: '#475569', fontSize: 16, textAlign: 'center' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E0F2FE' },
  successCircle: { backgroundColor: '#D1FAE5' },
  title: { marginTop: 24, color: '#0F172A', fontSize: 28, lineHeight: 34, fontWeight: '800', textAlign: 'center' },
  subtitle: { marginTop: 12, color: '#475569', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  previewCard: { marginTop: 28, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 20, backgroundColor: '#fff', padding: 20, gap: 16 },
  previewRow: { gap: 4 },
  previewLabel: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  previewValue: { color: '#0F172A', fontSize: 17, lineHeight: 24, fontWeight: '700' },
  errorCard: { marginTop: 28, borderWidth: 1, borderColor: '#FECDD3', borderRadius: 20, backgroundColor: '#FFF1F2', padding: 18 },
  errorText: { color: '#BE123C', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  retryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  retryText: { color: '#0369A1', fontWeight: '800' },
  primaryButton: { minHeight: 58, marginTop: 28, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0284C7', paddingHorizontal: 20 },
  disabledButton: { backgroundColor: '#94A3B8' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '800', textAlign: 'center' },
  cancelButton: { minHeight: 52, marginTop: 10, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#475569', fontSize: 15, fontWeight: '700' },
});
