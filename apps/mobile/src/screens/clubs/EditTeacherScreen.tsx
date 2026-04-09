import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { classesApi, teachersApi } from '@/api';

const COLORS = {
  bg: '#F8FBFF',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  primaryDark: '#0284C7',
  danger: '#EF4444',
};

type RouteParams = {
  teacherId: string;
  classId?: string;
};

type TeacherFormState = {
  firstName: string;
  lastName: string;
  khmerName: string;
  englishFirstName: string;
  englishLastName: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  hireDate: string;
  position: string;
  degree: string;
};

const INITIAL_FORM: TeacherFormState = {
  firstName: '',
  lastName: '',
  khmerName: '',
  englishFirstName: '',
  englishLastName: '',
  gender: 'MALE',
  dateOfBirth: '',
  phone: '',
  email: '',
  address: '',
  hireDate: '',
  position: '',
  degree: '',
};

const getRegionalValue = (customFields: Record<string, any> | null | undefined, key: string): string =>
  String(customFields?.regional?.[key] ?? customFields?.[key] ?? '');

export default function EditTeacherScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params || {}) as RouteParams;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherFormState>(INITIAL_FORM);

  const loadTeacher = useCallback(async () => {
    if (!params.teacherId) {
      setError('Missing teacher id');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const teacher = await teachersApi.getTeacherById(params.teacherId);
      const customFields = teacher.customFields as Record<string, any> | undefined;

      setForm({
        firstName: teacher.firstName || '',
        lastName: teacher.lastName || '',
        khmerName: getRegionalValue(customFields, 'khmerName'),
        englishFirstName: teacher.englishFirstName || '',
        englishLastName: teacher.englishLastName || '',
        gender: teacher.gender === 'FEMALE' ? 'FEMALE' : 'MALE',
        dateOfBirth: teacher.dateOfBirth || '',
        phone: teacher.phone || '',
        email: teacher.email || '',
        address: teacher.address || '',
        hireDate: teacher.hireDate || '',
        position: getRegionalValue(customFields, 'position'),
        degree: getRegionalValue(customFields, 'degree'),
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to load teacher');
    } finally {
      setLoading(false);
    }
  }, [params.teacherId]);

  useEffect(() => {
    loadTeacher();
  }, [loadTeacher]);

  const setField = <K extends keyof TeacherFormState>(key: K, value: TeacherFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (saving) return;

    if (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()) {
      Alert.alert('Validation', 'First name, last name, and phone are required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await teachersApi.updateTeacher(params.teacherId, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        khmerName: form.khmerName.trim(),
        englishFirstName: form.englishFirstName.trim(),
        englishLastName: form.englishLastName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        hireDate: form.hireDate.trim(),
        position: form.position.trim(),
        degree: form.degree.trim(),
      });

      if (params.classId) {
        classesApi.invalidateClassDetailBundleCache(params.classId);
      }

      Alert.alert('Saved', 'Teacher updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Failed to save teacher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Teacher</Text>
        <TouchableOpacity disabled={saving} onPress={handleSave} style={styles.saveBtn}>
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Basic Info</Text>

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.half]}
                  placeholder="First Name"
                  value={form.firstName}
                  onChangeText={(value) => setField('firstName', value)}
                />
                <TextInput
                  style={[styles.input, styles.half]}
                  placeholder="Last Name"
                  value={form.lastName}
                  onChangeText={(value) => setField('lastName', value)}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Khmer Name"
                value={form.khmerName}
                onChangeText={(value) => setField('khmerName', value)}
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.half]}
                  placeholder="English Last Name"
                  value={form.englishLastName}
                  onChangeText={(value) => setField('englishLastName', value)}
                />
                <TextInput
                  style={[styles.input, styles.half]}
                  placeholder="English First Name"
                  value={form.englishFirstName}
                  onChangeText={(value) => setField('englishFirstName', value)}
                />
              </View>

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.choicePill, form.gender === 'MALE' && styles.choicePillActive]}
                  onPress={() => setField('gender', 'MALE')}
                >
                  <Text style={[styles.choiceText, form.gender === 'MALE' && styles.choiceTextActive]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.choicePill, form.gender === 'FEMALE' && styles.choicePillActive]}
                  onPress={() => setField('gender', 'FEMALE')}
                >
                  <Text style={[styles.choiceText, form.gender === 'FEMALE' && styles.choiceTextActive]}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Professional</Text>
              <TextInput
                style={styles.input}
                placeholder="Date of Birth (YYYY-MM-DD)"
                value={form.dateOfBirth}
                onChangeText={(value) => setField('dateOfBirth', value)}
              />
              <TextInput
                style={styles.input}
                placeholder="Hire Date (YYYY-MM-DD)"
                value={form.hireDate}
                onChangeText={(value) => setField('hireDate', value)}
              />
              <TextInput
                style={styles.input}
                placeholder="Position"
                value={form.position}
                onChangeText={(value) => setField('position', value)}
              />
              <TextInput
                style={styles.input}
                placeholder="Degree"
                value={form.degree}
                onChangeText={(value) => setField('degree', value)}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone"
                value={form.phone}
                onChangeText={(value) => setField('phone', value)}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={form.email}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(value) => setField('email', value)}
              />
              <TextInput
                style={[styles.input, styles.multiInput]}
                multiline
                placeholder="Address"
                value={form.address}
                onChangeText={(value) => setField('address', value)}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveBtn: {
    minWidth: 64,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
  },
  saveText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    color: COLORS.text,
    flex: 1,
  },
  half: {
    flex: 1,
  },
  multiInput: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  choicePill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  choicePillActive: {
    borderColor: COLORS.primaryDark,
    backgroundColor: '#E0F2FE',
  },
  choiceText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  choiceTextActive: {
    color: COLORS.primaryDark,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
});
