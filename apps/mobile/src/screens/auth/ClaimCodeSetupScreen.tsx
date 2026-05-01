import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { decodeQRFromImage } from '@/utils/qrDecoder';
import { Button, Input } from '@/components/common';
import { authApi } from '@/api/client';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND_TEAL = '#09CFF7';
const SCANNER_SIZE = SCREEN_WIDTH * 0.72;

function parseClaimCodeFromScan(rawData: string): string | null {
  const trimmed = rawData?.trim();
  if (!trimmed) return null;

  const codeMatch = trimmed.match(/[?&]code=([^&]+)/i);
  if (codeMatch?.[1]) {
    try {
      return decodeURIComponent(codeMatch[1]).trim().toUpperCase();
    } catch {
      return codeMatch[1].trim().toUpperCase();
    }
  }

  if (trimmed.includes('://')) {
    return null;
  }

  return trimmed.toUpperCase();
}

// ─── QR Scanner Modal ────────────────────────────────────────────────────────

function QRScannerModal({
  visible,
  onScan,
  onClose,
  onBrowse,
}: {
  visible: boolean;
  onScan: (code: string) => void;
  onClose: () => void;
  onBrowse: () => void;
}) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false); // prevent multiple fires per scan

  useEffect(() => {
    if (visible) {
      scannedRef.current = false;
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    const parsedCode = parseClaimCodeFromScan(data);
    if (!parsedCode) {
      scannedRef.current = true;
      Alert.alert(t('auth.claimCodeSetup.alerts.invalidQrTitle'), t('auth.claimCodeSetup.alerts.invalidQrBody'));
      setTimeout(() => {
        scannedRef.current = false;
      }, 600);
      return;
    }

    scannedRef.current = true;
    onScan(parsedCode);
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={scanStyles.container}>
          <Text style={scanStyles.permissionText}>{t('auth.claimCodeSetup.scanner.checkingPermission')}</Text>
        </SafeAreaView>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={scanStyles.container}>
          <Ionicons name="camera-outline" size={56} color="#6B7280" style={{ marginBottom: 16 }} />
          <Text style={scanStyles.permissionText}>{t('auth.claimCodeSetup.scanner.permissionRequired')}</Text>
          <TouchableOpacity style={scanStyles.permBtn} onPress={requestPermission}>
            <Text style={scanStyles.permBtnText}>{t('auth.claimCodeSetup.scanner.grantPermission')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[scanStyles.permBtn, { backgroundColor: 'transparent', marginTop: 8 }]} onPress={onClose}>
            <Text style={[scanStyles.permBtnText, { color: '#6B7280' }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={scanStyles.container}>
        {/* Header */}
        <View style={scanStyles.header}>
          <TouchableOpacity onPress={onClose} style={scanStyles.closeBtn}>
            <Ionicons name="close" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={scanStyles.headerTitle}>{t('auth.claimCodeSetup.scanner.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={scanStyles.hint}>
          {t('auth.claimCodeSetup.scanner.hint')}
        </Text>

        {/* Camera with overlay */}
        <View style={scanStyles.cameraWrapper}>
          <CameraView
            style={scanStyles.camera}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />

          {/* Dark overlay with transparent hole */}
          <View style={scanStyles.overlay} pointerEvents="none">
            {/* Top bar */}
            <View style={scanStyles.overlayTop} />
            <View style={scanStyles.overlayMiddleRow}>
              {/* Left bar */}
              <View style={scanStyles.overlaySide} />
              {/* Transparent scanner hole */}
              <View style={scanStyles.scanHole}>
                {/* Corner decorations */}
                <View style={[scanStyles.corner, scanStyles.cornerTL]} />
                <View style={[scanStyles.corner, scanStyles.cornerTR]} />
                <View style={[scanStyles.corner, scanStyles.cornerBL]} />
                <View style={[scanStyles.corner, scanStyles.cornerBR]} />
              </View>
              {/* Right bar */}
              <View style={scanStyles.overlaySide} />
            </View>
            {/* Bottom bar */}
            <View style={scanStyles.overlayBottom} />
          </View>
        </View>

        <Text style={scanStyles.footerHint}>
          {t('auth.claimCodeSetup.scanner.footerHint')}
        </Text>

        {/* Gallery button inside scanner */}
        <TouchableOpacity style={scanStyles.galleryBtn} onPress={onBrowse}>
          <Ionicons name="images" size={20} color="#fff" />
          <Text style={scanStyles.galleryBtnText}>{t('auth.claimCodeSetup.scanner.openGallery')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ClaimCodeSetupScreen() {
    const { t: autoT } = useTranslation();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const login = useAuthStore((state) => state.login);

  const [step, setStep] = useState(1);
  const [claimCode, setClaimCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [claimCodeData, setClaimCodeData] = useState<any>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const validateCode = async (code: string) => {
    setValidatingCode(true);
    try {
      const response = await authApi.post(
        '/auth/claim-codes/validate',
        { code },
        {
          // Keep this screen responsive: don't allow long global timeout retries here.
          timeout: 15000,
          headers: { 'X-No-Retry': '1' },
        }
      );
      if (response.data.success) {
        setClaimCode(code);
        setClaimCodeData(response.data.data);
        setStep(2);
      } else {
        Alert.alert(t('auth.claimCodeSetup.alerts.invalidCodeTitle'), response.data.error || t('auth.claimCodeSetup.alerts.validateFailed'));
      }
    } catch (error: any) {
      const timeout = error?.code === 'ECONNABORTED' || String(error?.message || '').toLowerCase().includes('timeout');
      const errorMsg = timeout
        ? t('auth.claimCodeSetup.alerts.validationTimeout')
        : error.response?.data?.error || error.message || t('auth.claimCodeSetup.alerts.networkError');
      Alert.alert(t('common.error'), errorMsg);
    } finally {
      setValidatingCode(false);
    }
  };

  const handleValidateClaimCode = async () => {
    if (!claimCode.trim()) {
      Alert.alert(t('auth.claimCodeSetup.alerts.requiredTitle'), t('auth.claimCodeSetup.alerts.enterClaimCode'));
      return;
    }
    const parsedCode = parseClaimCodeFromScan(claimCode);
    if (!parsedCode) {
      Alert.alert(t('auth.claimCodeSetup.alerts.invalidCodeTitle'), t('auth.claimCodeSetup.alerts.enterValidClaimCode'));
      return;
    }
    await validateCode(parsedCode);
  };

  const handleQRScanned = async (scannedCode: string) => {
    setScannerVisible(false);
    // Small delay so modal closes before we show any alert
    setTimeout(() => validateCode(scannedCode), 400);
  };

  const handleBrowseFromGallery = async () => {
    setIsBrowsing(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('auth.claimCodeSetup.alerts.permissionDeniedTitle'), t('auth.claimCodeSetup.alerts.photoPermissionBody'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        
        // Use pure-JS decoder to avoid native module errors in Expo Go
        const scannedRawData = await decodeQRFromImage(imageUri);
        const parsedCode = scannedRawData ? parseClaimCodeFromScan(scannedRawData) : null;
        
        if (parsedCode) {
          if (scannerVisible) setScannerVisible(false);
          validateCode(parsedCode);
        } else {
          Alert.alert(t('auth.claimCodeSetup.alerts.noQrFoundTitle'), t('auth.claimCodeSetup.alerts.noQrFoundBody'));
        }
      }
    } catch (error) {
      console.error('Gallery scan error:', error);
      Alert.alert(t('common.error'), t('auth.claimCodeSetup.alerts.scanImageFailed'));
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleConfirmIdentity = () => setStep(3);

  const handleCompleteRegistration = async () => {
    const identifier = email.trim();
    if (!identifier || !password) {
      Alert.alert(t('auth.claimCodeSetup.alerts.requiredTitle'), t('auth.claimCodeSetup.alerts.enterCredentials'));
      return;
    }

    const isEmail = identifier.includes('@');

    setIsRegistering(true);
    try {
      const response = await authApi.post('/auth/register/with-claim-code', {
        code: claimCode.trim(),
        ...(isEmail ? { email: identifier } : { phone: identifier }),
        password,
      });
      if (response.data.success) {
        const loggedIn = await login({
          ...(isEmail ? { email: identifier } : { phone: identifier }),
          password,
          rememberMe: true,
        });

        if (loggedIn) {
          Alert.alert(t('common.success'), t('auth.claimCodeSetup.alerts.accountCreated'));
        } else {
          Alert.alert(
            t('common.success'),
            t('auth.claimCodeSetup.alerts.accountCreated'),
            [{ text: t('common.ok'), onPress: () => navigation.navigate('Login') }]
          );
        }
      } else {
        Alert.alert(t('common.error'), response.data.error || t('auth.claimCodeSetup.alerts.registrationFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.response?.data?.error || t('auth.claimCodeSetup.alerts.registrationFailed'));
    } finally {
      setIsRegistering(false);
    }
  };

  // ─── Step 1: Enter or Scan Code ──────────────────────────────────────────

  const renderValidationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>{t('auth.claimCodeSetup.validation.title')}</Text>
      <Text style={styles.subtitle}>{t('auth.claimCodeSetup.validation.subtitle')}</Text>

      {/* Action Buttons Row */}
      <View style={{ gap: 12, marginBottom: 20 }}>
        {/* QR Scan button */}
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => setScannerVisible(true)}
          activeOpacity={0.85}
        >
          <View style={styles.scanBtnIcon}>
            <Ionicons name="camera-outline" size={26} color={BRAND_TEAL} />
          </View>
          <View style={styles.scanBtnText}>
            <Text style={styles.scanBtnTitle}>{t('auth.claimCodeSetup.validation.scanQr')}</Text>
            <Text style={styles.scanBtnSub}>{t('auth.claimCodeSetup.validation.scanQrSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Browse from Photos button */}
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={handleBrowseFromGallery}
          activeOpacity={0.85}
          disabled={isBrowsing}
        >
          <View style={[styles.scanBtnIcon, { backgroundColor: '#F0FDFA' }]}>
            <Ionicons name="images-outline" size={26} color="#10B981" />
          </View>
          <View style={styles.scanBtnText}>
            <Text style={styles.scanBtnTitle}>{t('auth.claimCodeSetup.validation.browsePhotos')}</Text>
            <Text style={styles.scanBtnSub}>{t('auth.claimCodeSetup.validation.browsePhotosSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('auth.claimCodeSetup.validation.orTypeManually')}</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Manual input */}
      <Input
        placeholder={autoT("auto.mobile.screens_auth_ClaimCodeSetupScreen.k_d28a9c3b")}
        value={claimCode}
        onChangeText={(v) => setClaimCode(v.toUpperCase())}
        autoCapitalize="characters"
        editable={!validatingCode}
      />
      <Button
        size="lg"
        title={validatingCode ? t('auth.claimCodeSetup.validation.validating') : t('common.next')}
        onPress={handleValidateClaimCode}
        disabled={validatingCode}
        style={{ marginTop: 20 }}
      />

      {/* Scanner modal */}
      <QRScannerModal
        visible={scannerVisible}
        onScan={handleQRScanned}
        onClose={() => setScannerVisible(false)}
        onBrowse={handleBrowseFromGallery}
      />
    </View>
  );

  // ─── Step 2: Confirm Identity ────────────────────────────────────────────

  const renderConfirmationStep = () => {
    const student = claimCodeData?.student;
    const teacher = claimCodeData?.teacher;
    const name = student
      ? `${student.firstName} ${student.lastName}`
      : teacher
      ? `${teacher.firstName} ${teacher.lastName}`
      : t('common.unknown');
    const role = student ? t('auth.claimCodeSetup.confirmation.roleStudent') : teacher ? t('auth.claimCodeSetup.confirmation.roleTeacher') : t('auth.claimCodeSetup.confirmation.roleUser');
    const schoolName = claimCodeData?.school?.name || t('auth.claimCodeSetup.confirmation.schoolFallback');
    const className =
      student?.className ||
      student?.class?.name ||
      teacher?.homeroomClass?.name ||
      null;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.confirmBadge}>
          <Ionicons name="shield-checkmark-outline" size={30} color={BRAND_TEAL} />
        </View>
        <Text style={styles.title}>{t('auth.claimCodeSetup.confirmation.title')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.claimCodeSetup.confirmation.subtitle')}
        </Text>

        <View style={styles.card}>
          <Row icon="school-outline" label={t('auth.claimCodeSetup.confirmation.schoolLabel')} value={schoolName} />
          <Row icon="person-outline" label={role} value={name} />
          {className && <Row icon="book-outline" label={t('auth.claimCodeSetup.confirmation.classLabel')} value={className} />}
        </View>

        <Text style={styles.warningText}>
          {t('auth.claimCodeSetup.confirmation.warning')}
        </Text>

        <Button size="lg" title={t('auth.claimCodeSetup.confirmation.confirmButton')} onPress={handleConfirmIdentity} style={{ marginTop: 24 }} />
        <Button
          size="lg"
          title={t('auth.claimCodeSetup.confirmation.goBackButton')}
          variant="outline"
          onPress={() => setStep(1)}
          style={{ marginTop: 12 }}
        />
      </View>
    );
  };

  // ─── Step 3: Set Credentials ─────────────────────────────────────────────

  const renderCredentialStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.confirmBadge}>
        <Ionicons name="checkmark-circle-outline" size={30} color={BRAND_TEAL} />
      </View>
      <Text style={styles.title}>{t('auth.claimCodeSetup.credentials.title')}</Text>
      <Text style={styles.subtitle}>{t('auth.claimCodeSetup.credentials.subtitle')}</Text>

      <Input
        label={t('auth.claimCodeSetup.credentials.emailOrPhone')}
        placeholder={t('auth.claimCodeSetup.credentials.emailOrPhonePlaceholder')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        editable={!isRegistering}
      />
      <Input
        label={t('auth.claimCodeSetup.credentials.password')}
        placeholder={t('auth.claimCodeSetup.credentials.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        showPasswordToggle
        editable={!isRegistering}
        containerStyle={{ marginTop: 12 }}
      />
      <Button
        size="lg"
        title={isRegistering ? t('auth.claimCodeSetup.credentials.creatingAccount') : t('auth.claimCodeSetup.credentials.completeSetup')}
        onPress={handleCompleteRegistration}
        disabled={isRegistering}
        style={{ marginTop: 24 }}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {/* Step indicators */}
          <View style={styles.stepIndicatorRow}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[styles.stepDot, step >= s && styles.stepDotActive]}
              />
            ))}
          </View>

          {step === 1 && renderValidationStep()}
          {step === 2 && renderConfirmationStep()}
          {step === 3 && renderCredentialStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Helper Row ──────────────────────────────────────────────────────────────

function Row({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconBox}>
        <Ionicons name={icon} size={18} color={BRAND_TEAL} />
      </View>
      <View style={rowStyles.textCol}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  flex: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  backBtn: { marginBottom: 12, width: 40, height: 40, justifyContent: 'center' },
  stepContainer: { flex: 1 },

  stepIndicatorRow: { flexDirection: 'row', gap: 6, marginBottom: 28 },
  stepDot: { width: 24, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  stepDotActive: { backgroundColor: BRAND_TEAL },

  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 28, lineHeight: 22 },

  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  scanBtnIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#E8FCFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnText: { flex: 1 },
  scanBtnTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  scanBtnSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  confirmBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#E8FCFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginTop: 16,
    textAlign: 'center',
  },
});

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8FCFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },
});

const OVERLAY_COLOR = 'rgba(0,0,0,0.65)';

const scanStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hint: {
    color: '#D1D5DB',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  cameraWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  camera: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { width: '100%', height: (SCREEN_WIDTH - SCANNER_SIZE) / 2, backgroundColor: OVERLAY_COLOR },
  overlayMiddleRow: { flexDirection: 'row', height: SCANNER_SIZE },
  overlaySide: { flex: 1, backgroundColor: OVERLAY_COLOR },
  scanHole: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    position: 'relative',
  },
  overlayBottom: { width: '100%', flex: 1, backgroundColor: OVERLAY_COLOR },

  // Corner decorations
  corner: { position: 'absolute', width: 24, height: 24, borderColor: BRAND_TEAL, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  footerHint: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 32,
    marginTop: 28,
    marginBottom: 20,
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  galleryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24, paddingHorizontal: 32 },
  permBtn: {
    backgroundColor: BRAND_TEAL,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  permBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
});
