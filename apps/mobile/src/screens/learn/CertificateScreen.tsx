import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getCertificate, CertificateData } from '../../api/learn';
import { useTranslation } from 'react-i18next';
import { CelebrationConfetti } from '@/components/common';

type RootStackParamList = {
  Certificate: { courseId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Certificate'>;

export default function CertificateScreen({ route, navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { courseId } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CertificateData | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getCertificate(courseId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const shareCertificate = async () => {
    if (!data) return;
    try {
      await Share.share({
        message: `I just completed "${data.course.title}" on Stunity! Verification Code: ${data.verificationCode}`,
        url: `https://stunity.com/verify/${data.verificationCode}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('learn.certificate.loadFailed')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t('learn.certificate.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dateIssued = new Date(data.issuedAt).toLocaleDateString(i18n.language?.startsWith('km') ? 'km-KH' : undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <SafeAreaView style={styles.container}>
      <CelebrationConfetti count={150} origin={{ x: -10, y: 0 }} fallSpeed={3000} fadeOut />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="close" size={28} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.ribbon}>
          <Ionicons name="ribbon" size={48} color="#F59E0B" />
        </View>

        <Text style={styles.title}>{t('learn.certificate.title')}</Text>
        
        <Text style={styles.subtitle}>{t('learn.certificate.certifiesThat')}</Text>
        <Text style={styles.name}>{data.user.firstName} {data.user.lastName}</Text>
        
        <Text style={styles.subtitle}>{t('learn.certificate.completed')}</Text>
        <Text style={styles.courseTitle}>{data.course.title}</Text>
        
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('learn.certificate.issueDate')}</Text>
            <Text style={styles.detailValue}>{dateIssued}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('learn.certificate.instructor')}</Text>
            <Text style={styles.detailValue}>{data.course.instructor.firstName} {data.course.instructor.lastName}</Text>
          </View>
        </View>

        <View style={styles.verificationBox}>
          <Text style={styles.verificationLabel}>{t('learn.certificate.verificationId')}</Text>
          <Text style={styles.verificationCode}>{data.verificationCode}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareButton} onPress={shareCertificate}>
          <Ionicons name="share-outline" size={20} color="#FFFFFF" style={{marginRight: 8}}/>
          <Text style={styles.shareText}>{t('learn.certificate.shareAchievement')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, alignItems: 'flex-end' },
  iconButton: { padding: 8 },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  ribbon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 32,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  name: {
    fontSize: 32,
    color: '#111827',
    marginBottom: 32,
    textAlign: 'center',
    textTransform: 'capitalize'
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 32,
    textAlign: 'center',
  },
  detailsGrid: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 24,
    marginBottom: 24,
  },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#4B5563', fontWeight: '500' },
  verificationBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  verificationLabel: { fontSize: 12, color: '#6B7280' },
  verificationCode: { fontSize: 13, color: '#111827', fontWeight: 'bold' },
  footer: { padding: 20 },
  shareButton: {
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  shareText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#EF4444', marginBottom: 16 },
  backButton: { padding: 12, backgroundColor: '#E5E7EB', borderRadius: 8 },
  backButtonText: { color: '#374151', fontWeight: 'bold' }
});
