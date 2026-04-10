/**
 * MyQRCardScreen
 *
 * Displays the user's personal digital ID card with an embedded QR code.
 * The QR encodes a JSON payload: { userId, role, studentId/teacherId }
 * so admins / teachers can scan it to identify the person instantly.
 *
 * Navigated to from the Profile screen header or menu.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Share,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useAuthStore } from '@/stores';

const { width: SW } = Dimensions.get('window');
const CARD_WIDTH = SW - 48;
const QR_SIZE = CARD_WIDTH * 0.52;
const BRAND_TEAL = '#09CFF7';

// Role → readable label + gradient colours
function roleStyle(role?: string): { label: string; colors: [string, string]; accent: string } {
  switch (role) {
    case 'TEACHER':
      return { label: 'Teacher', colors: ['#0EA5E9', '#6366F1'], accent: '#6366F1' };
    case 'ADMIN':
    case 'SCHOOL_ADMIN':
      return { label: 'Admin', colors: ['#F59E0B', '#EF4444'], accent: '#EF4444' };
    case 'PARENT':
      return { label: 'Parent', colors: ['#10B981', '#0EA5E9'], accent: '#10B981' };
    default: // STUDENT
      return { label: 'Student', colors: ['#09CFF7', '#6366F1'], accent: BRAND_TEAL };
  }
}

export default function MyQRCardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const qrRef = useRef<any>(null);

  if (!user) return null;

  const rStyle = roleStyle(user.role);

  // Identifier shown on card and encoded in QR
  const studentId = user.student?.studentId ?? null;
  const displayId = studentId || user.id;

  const className =
    (user as any).student?.class?.name ||
    (user as any).teacher?.homeroomClass?.name ||
    null;

  const schoolName = user.school?.name ?? 'Stunity';

  // QR payload — scanned by admin / teacher systems
  const qrPayload = JSON.stringify({
    userId: user.id,
    role: user.role,
    schoolId: user.schoolId ?? null,
    v: 1,
    ...(studentId && { studentId }),
    ...(user.teacher?.id && { teacherId: user.teacher.id }),
    // Keep legacy key for scanners that still read `school`.
    school: user.schoolId ?? null,
  });

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `My Stunity ID: ${fullName} (${rStyle.label})\nID: ${displayId}\nSchool: ${schoolName}`,
        title: `${fullName} – Stunity ID`,
      });
    } catch (_) {/* ignore */}
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Gradient background */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My ID Card</Text>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Card */}
        <View style={styles.cardWrapper}>
          {/* Card glow */}
          <LinearGradient
            colors={rStyle.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGlow}
          />

          <View style={styles.card}>
            {/* Card top — coloured stripe */}
            <LinearGradient
              colors={rStyle.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardStripe}
            >
              <Text style={styles.schoolName} numberOfLines={1}>{schoolName}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{rStyle.label}</Text>
              </View>
            </LinearGradient>

            {/* Card body */}
            <View style={styles.cardBody}>
              {/* Avatar placeholder */}
              <View style={[styles.avatar, { borderColor: rStyle.accent }]}>
                <Text style={styles.avatarInitial}>
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </Text>
              </View>

              {/* Name */}
              <Text style={styles.name}>{fullName}</Text>
              {className && (
                <View style={styles.classRow}>
                  <Ionicons name="book-outline" size={13} color="#94A3B8" />
                  <Text style={styles.classText}>{className}</Text>
                </View>
              )}

              {/* QR Code */}
              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrPayload}
                  size={QR_SIZE}
                  color="#0F172A"
                  backgroundColor="#FFFFFF"
                  getRef={(c) => { qrRef.current = c; }}
                  // Use a logo or ecl HIGH for better reliability
                  ecl="H"
                />
              </View>

              {/* ID below QR */}
              <Text style={styles.idLabel}>Scan to identify</Text>
              <Text style={styles.idValue}>{displayId}</Text>
            </View>

            {/* Card footer */}
            <View style={styles.cardFooter}>
              <View style={styles.footerDot} />
              <Text style={styles.footerText}>Stunity Enterprise</Text>
              <View style={styles.footerDot} />
            </View>
          </View>
        </View>

        {/* Hint */}
        <Text style={styles.hint}>
          Show this QR to your teacher or school admin{'\n'}so they can verify your identity instantly.
        </Text>

        {/* Keep screen on note */}
        <View style={styles.tipRow}>
          <Ionicons name="bulb-outline" size={15} color="#94A3B8" />
          <Text style={styles.tipText}>Keep screen brightness high for best results.</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const CARD_RADIUS = 24;

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Glow effect behind card
  cardWrapper: { alignItems: 'center', justifyContent: 'center', width: CARD_WIDTH },
  cardGlow: {
    position: 'absolute',
    width: CARD_WIDTH - 20,
    height: '100%',
    borderRadius: CARD_RADIUS + 8,
    opacity: 0.25,
    transform: [{ scaleY: 0.9 }, { translateY: 16 }],
  },

  card: {
    width: CARD_WIDTH,
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
  },

  cardStripe: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  schoolName: { color: '#fff', fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  roleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  cardBody: { alignItems: 'center', paddingTop: 24, paddingBottom: 20, paddingHorizontal: 24 },

  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitial: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: 1 },

  name: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 20 },
  classText: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  qrWrapper: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },

  idLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  idValue: { fontSize: 13, color: '#475569', fontWeight: '700', fontVariant: ['tabular-nums'] },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  footerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },
  footerText: { fontSize: 11, color: '#94A3B8', fontWeight: '700', letterSpacing: 0.5 },

  hint: {
    marginTop: 28,
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 32,
  },
  tipText: { color: '#64748B', fontSize: 12, fontWeight: '500' },
});
