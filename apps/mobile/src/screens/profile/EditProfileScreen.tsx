import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * Edit Profile Screen — Clean Professional Design
 *
 * Flat layout, fully rounded inputs, iOS-style header
 * Photo upload + form fields with API integration
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '@/stores';
import { Avatar } from '@/components/common';
import { ProfileStackScreenProps } from '@/navigation/types';
import { fetchProfile, updateProfile, uploadProfilePhoto, uploadCoverPhoto } from '@/api/profileApi';
import { authApi } from '@/api/client';
import { useThemeContext } from '@/contexts';

type NavigationProp = ProfileStackScreenProps<'EditProfile'>['navigation'];

interface FormData {
  firstName: string;
  lastName: string;
  englishFirstName: string;
  englishLastName: string;
  headline: string;
  bio: string;
  location: string;
  interests: string;
  socialLinks: {
    github: string;
    linkedin: string;
    facebook: string;
    portfolio: string;
  };
  customFields: Record<string, string>;
}

type CustomFieldConfig = {
  key: string;
  label: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
};

const STUDENT_FAMILY_FIELDS: CustomFieldConfig[] = [
  { key: 'fatherName', label: "Father's Name", placeholder: 'Father full name', icon: 'man-outline' },
  { key: 'motherName', label: "Mother's Name", placeholder: 'Mother full name', icon: 'woman-outline' },
  { key: 'parentPhone', label: 'Parent Phone', placeholder: '+855...', icon: 'call-outline', keyboardType: 'phone-pad' },
  { key: 'parentOccupation', label: 'Parent Occupation', placeholder: 'Occupation', icon: 'briefcase-outline' },
];

const STUDENT_SCHOOL_FIELDS: CustomFieldConfig[] = [
  { key: 'placeOfBirth', label: 'Place of Birth', placeholder: 'Province / city', icon: 'location-outline' },
  { key: 'currentAddress', label: 'Current Address', placeholder: 'Current address', icon: 'home-outline' },
  { key: 'previousSchool', label: 'Previous School', placeholder: 'Previous school', icon: 'business-outline' },
  { key: 'previousGrade', label: 'Previous Grade', placeholder: 'Previous grade', icon: 'school-outline' },
  { key: 'repeatingGrade', label: 'Repeating Grade', placeholder: 'Yes / No', icon: 'repeat-outline' },
  { key: 'transferredFrom', label: 'Transferred From', placeholder: 'Transfer source', icon: 'swap-horizontal-outline' },
];

const STUDENT_EXAM_FIELDS: CustomFieldConfig[] = [
  { key: 'grade9ExamSession', label: 'Grade 9 Session', placeholder: 'Exam session', icon: 'calendar-outline' },
  { key: 'grade9ExamCenter', label: 'Grade 9 Center', placeholder: 'Exam center', icon: 'business-outline' },
  { key: 'grade9ExamRoom', label: 'Grade 9 Room', placeholder: 'Room', icon: 'albums-outline' },
  { key: 'grade9ExamDesk', label: 'Grade 9 Desk', placeholder: 'Desk number', icon: 'apps-outline' },
  { key: 'grade9PassStatus', label: 'Grade 9 Result', placeholder: 'Pass / fail / pending', icon: 'checkmark-circle-outline' },
  { key: 'grade12ExamSession', label: 'Grade 12 Session', placeholder: 'Exam session', icon: 'calendar-outline' },
  { key: 'grade12ExamCenter', label: 'Grade 12 Center', placeholder: 'Exam center', icon: 'business-outline' },
  { key: 'grade12ExamRoom', label: 'Grade 12 Room', placeholder: 'Room', icon: 'albums-outline' },
  { key: 'grade12ExamDesk', label: 'Grade 12 Desk', placeholder: 'Desk number', icon: 'apps-outline' },
  { key: 'grade12Track', label: 'Grade 12 Track', placeholder: 'Science / social science', icon: 'git-branch-outline' },
  { key: 'grade12PassStatus', label: 'Grade 12 Result', placeholder: 'Pass / fail / pending', icon: 'checkmark-circle-outline' },
];

const TEACHER_PROFESSIONAL_FIELDS: CustomFieldConfig[] = [
  { key: 'position', label: 'Position', placeholder: 'Math teacher', icon: 'briefcase-outline' },
  { key: 'workingLevel', label: 'Working Level', placeholder: 'Lower / upper secondary', icon: 'stats-chart-outline' },
  { key: 'salaryRange', label: 'Salary Range', placeholder: 'Salary band', icon: 'wallet-outline' },
  { key: 'degree', label: 'Degree', placeholder: 'Highest degree', icon: 'school-outline' },
  { key: 'major1', label: 'Major 1', placeholder: 'Primary major', icon: 'book-outline' },
  { key: 'major2', label: 'Major 2', placeholder: 'Secondary major', icon: 'library-outline' },
];

const TEACHER_IDENTITY_FIELDS: CustomFieldConfig[] = [
  { key: 'idCard', label: 'ID Card No.', placeholder: 'National ID', icon: 'card-outline' },
  { key: 'passport', label: 'Passport No.', placeholder: 'Passport number', icon: 'document-text-outline' },
  { key: 'nationality', label: 'Nationality', placeholder: 'Nationality', icon: 'flag-outline' },
  { key: 'emergencyContact', label: 'Emergency Contact', placeholder: 'Contact name', icon: 'person-circle-outline' },
  { key: 'emergencyPhone', label: 'Emergency Phone', placeholder: '+855...', icon: 'call-outline', keyboardType: 'phone-pad' },
];

function getRegionalValue(customFields: Record<string, any> | null | undefined, key: string): string {
  const value = customFields?.regional?.[key] ?? customFields?.[key] ?? '';
  return value == null ? '' : String(value);
}

function getNativeFullName(firstName: string, lastName: string): string {
  return [lastName.trim(), firstName.trim()].filter(Boolean).join(' ');
}

function hydrateFormData(profile: any): FormData {
  const sl = profile?.socialLinks || {};
  const roleFields = profile?.role === 'TEACHER' ? profile.teacher?.customFields : profile?.student?.customFields;
  const fieldKeys = [
    ...STUDENT_FAMILY_FIELDS,
    ...STUDENT_SCHOOL_FIELDS,
    ...STUDENT_EXAM_FIELDS,
    ...TEACHER_PROFESSIONAL_FIELDS,
    ...TEACHER_IDENTITY_FIELDS,
    { key: 'remarks' },
  ].map(field => field.key);
  const customFields = fieldKeys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = getRegionalValue(roleFields, key);
    return acc;
  }, {});

  // Backward compatibility with older mobile profile fields.
  customFields.parentName = getRegionalValue(roleFields, 'parentName') || customFields.fatherName || customFields.motherName || '';

  return {
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    englishFirstName: profile?.englishFirstName || '',
    englishLastName: profile?.englishLastName || '',
    headline: profile?.headline || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    interests: (profile?.interests || []).join(', '),
    socialLinks: {
      github: sl.github || '',
      linkedin: sl.linkedin || '',
      facebook: sl.facebook || '',
      portfolio: sl.portfolio || '',
    },
    customFields,
  };
}

function mergePendingIntoFormData(base: FormData, requestedData: any): FormData {
  if (!requestedData || typeof requestedData !== 'object') return base;

  const pendingRegional = requestedData.customFields?.regional || {};
  const pendingSocialLinks = requestedData.socialLinks || {};

  return {
    ...base,
    firstName: requestedData.firstName !== undefined ? requestedData.firstName || '' : base.firstName,
    lastName: requestedData.lastName !== undefined ? requestedData.lastName || '' : base.lastName,
    englishFirstName: requestedData.englishFirstName !== undefined ? requestedData.englishFirstName || '' : base.englishFirstName,
    englishLastName: requestedData.englishLastName !== undefined ? requestedData.englishLastName || '' : base.englishLastName,
    headline: requestedData.headline !== undefined ? requestedData.headline || '' : base.headline,
    bio: requestedData.bio !== undefined ? requestedData.bio || '' : base.bio,
    location: requestedData.location !== undefined ? requestedData.location || '' : base.location,
    interests: Array.isArray(requestedData.interests) ? requestedData.interests.join(', ') : base.interests,
    socialLinks: {
      ...base.socialLinks,
      ...pendingSocialLinks,
    },
    customFields: {
      ...base.customFields,
      ...Object.fromEntries(
        Object.entries(pendingRegional).map(([key, value]) => [key, value == null ? '' : String(value)])
      ),
    },
  };
}

export default function EditProfileScreen() {
    const { t: autoT } = useTranslation();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user, updateUser } = useAuthStore();
  const { colors, isDark } = useThemeContext();
  const s = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const coverPlaceholderColors = useMemo<[string, string, string]>(
    () => (isDark ? [colors.surfaceVariant, colors.card, colors.background] : ['#BAE6FD', '#E0F2FE', '#F0F9FF']),
    [colors.background, colors.card, colors.surfaceVariant, isDark]
  );
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [localProfilePic, setLocalProfilePic] = useState<string | null>(null);
  const [localCoverPic, setLocalCoverPic] = useState<string | null>(null);
  const [pendingProfileChange, setPendingProfileChange] = useState<any | null>(null);

  const isProfileLocked = React.useMemo(() => {
    if (user?.role === 'TEACHER') return user?.teacher?.isProfileLocked;
    if (user?.role === 'STUDENT') return user?.student?.isProfileLocked;
    return false;
  }, [user]);
  const isSchoolControlledProfile = React.useMemo(() => {
    const schoolLinked = Boolean(user?.schoolId || user?.student || user?.teacher);
    return schoolLinked && (user?.role === 'STUDENT' || user?.role === 'TEACHER');
  }, [user]);
  const isPendingApproval = Boolean(pendingProfileChange);
  const isProfileReadOnly = isSchoolControlledProfile && Boolean(isProfileLocked);
  const reviewRequired = isSchoolControlledProfile && !isProfileLocked;
  const saveDisabled = saving || isProfileReadOnly;
  const saveLabel = isPendingApproval ? 'Update' : reviewRequired ? 'Submit' : t('profile.save');

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    englishFirstName: '',
    englishLastName: '',
    headline: '',
    bio: '',
    location: '',
    interests: '',
    socialLinks: {
      github: '',
      linkedin: '',
      facebook: '',
      portfolio: '',
    },
    customFields: {},
  });

  const setCustomField = (key: string, value: string) => {
    setFormData(current => ({
      ...current,
      customFields: {
        ...current.customFields,
        [key]: value,
      },
    }));
  };

  const renderField = (field: CustomFieldConfig) => (
    <View key={field.key} style={s.fieldBlock}>
      <Text style={s.fieldLabel}>{field.label}</Text>
      <View style={[s.inputWrap, isProfileReadOnly && s.inputDisabled]}>
        <Ionicons name={field.icon} size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
        <TextInput
          style={s.input}
          value={formData.customFields[field.key] || ''}
          onChangeText={(value) => setCustomField(field.key, value)}
          placeholder={field.placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType={field.keyboardType || 'default'}
          autoCapitalize="words"
          editable={!isProfileReadOnly}
        />
      </View>
    </View>
  );

  const renderNativeFullName = () => {
    const nativeFullName = getNativeFullName(formData.firstName, formData.lastName);

    return (
      <View style={s.fieldBlock}>
        <Text style={s.fieldLabel}>Full Name (គោត្តនាម នាម)</Text>
        <View style={[s.inputWrap, s.readOnlyInputWrap]}>
          <Ionicons name="language-outline" size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
          <Text style={[s.readOnlyValue, !nativeFullName && s.readOnlyPlaceholder]} numberOfLines={1}>
            {nativeFullName || 'Auto-filled from last name + first name'}
          </Text>
        </View>
      </View>
    );
  };

  const renderSection = (title: string, subtitle: string, icon: keyof typeof Ionicons.glyphMap, children: React.ReactNode) => (
    <Animated.View style={s.sectionCard}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIcon}>
          <Ionicons name={icon} size={18} color="#0EA5E9" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>{title}</Text>
          <Text style={s.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </Animated.View>
  );

  useEffect(() => {
    let mounted = true;

    // Initial hydration from store
    if (user && formData.firstName === '') {
      setFormData(hydrateFormData(user));
    }

    // Fetch fresh profile data
    const loadFresh = async () => {
      try {
        const freshProfile = await fetchProfile('me');
        if (mounted && freshProfile) {
          // Sync with store to have coverPhotoUrl
          updateUser(freshProfile as any);

          let nextFormData = hydrateFormData(freshProfile);
          const freshProfileSchoolControlled =
            Boolean((freshProfile as any).schoolId || (freshProfile as any).student || (freshProfile as any).teacher) &&
            ((freshProfile as any).role === 'STUDENT' || (freshProfile as any).role === 'TEACHER');

          if (freshProfileSchoolControlled) {
            try {
              const { data } = await authApi.get('/users/me/profile-change-requests');
              const requests = Array.isArray(data?.data) ? data.data : [];
              const pending = requests[0] || null;
              if (mounted) {
                setPendingProfileChange(pending);
              }
              if (pending?.requestedData) {
                nextFormData = mergePendingIntoFormData(nextFormData, pending.requestedData);
              }
            } catch (err) {
              if (mounted) {
                setPendingProfileChange(null);
              }
            }
          }

          if (mounted) {
            setFormData(nextFormData);
          }
        }
      } catch (err) {
        // Silently ignore if fetch fails, store data is already hydration fallback
      }
    };

    loadFresh();

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadPendingProfileChange = async () => {
      if (!isSchoolControlledProfile) {
        setPendingProfileChange(null);
        return;
      }

      try {
        const { data } = await authApi.get('/users/me/profile-change-requests');
        const requests = Array.isArray(data?.data) ? data.data : [];
        if (mounted) {
          const pending = requests[0] || null;
          setPendingProfileChange(pending);
          if (pending?.requestedData) {
            setFormData(current => mergePendingIntoFormData(current, pending.requestedData));
          }
        }
      } catch (err) {
        if (mounted) {
          setPendingProfileChange(null);
        }
      }
    };

    loadPendingProfileChange();

    return () => { mounted = false; };
  }, [isSchoolControlledProfile, user?.id]);

  // ── Photo Pickers ────────────────────────────────────────────

  const pickProfilePhoto = async () => {
    if (isProfileReadOnly) {
      Alert.alert(
        'Profile locked',
        'Your school admin must unlock your profile before you can submit changes.'
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('profile.permissionNeeded'), t('profile.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLocalProfilePic(asset.uri);
      setUploadingPhoto(true);

      try {
        const fileName = asset.uri.split('/').pop() || 'profile.jpg';
        const mimeType = asset.mimeType || 'image/jpeg';
        const data = await uploadProfilePhoto(asset.uri, fileName, mimeType);
        const photoUrl = (data as any).profilePictureUrl;
        const photoKey = (data as any).profilePictureKey;
        if (isSchoolControlledProfile) {
          try {
            const response = await authApi.post('/users/me/profile-change-requests', {
              profilePictureUrl: photoUrl,
              profilePictureKey: photoKey,
            });
            setPendingProfileChange(response.data?.data || { status: 'PENDING' });
            Alert.alert(
              isPendingApproval ? 'Request updated' : 'Submitted for review',
              isPendingApproval
                ? 'Your pending profile photo change was updated.'
                : 'Your profile photo change is pending admin approval.'
            );
          } catch (error: any) {
            const existingPending = error?.response?.data?.data;
            if (error?.response?.status === 409 && existingPending) {
              setPendingProfileChange(existingPending);
              setLocalProfilePic(null);
              Alert.alert('Pending approval', 'Your last profile update is still waiting for admin approval.');
              return;
            }
            throw error;
          }
          return;
        }
        await updateProfile({ profilePictureUrl: photoUrl } as any);
        updateUser({ profilePictureUrl: photoUrl });
        Alert.alert(t('common.success'), t('profile.uploadSuccess'));
      } catch (error) {
        console.error('Upload profile photo error:', error);
        setLocalProfilePic(null);
        Alert.alert(t('common.error'), t('profile.uploadErrorMsg'));
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const pickCoverPhoto = async () => {
    if (isProfileReadOnly) {
      Alert.alert(
        'Profile locked',
        'Your school admin must unlock your profile before you can submit changes.'
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('profile.permissionNeeded'), t('profile.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLocalCoverPic(asset.uri);
      setUploadingCover(true);

      try {
        const fileName = asset.uri.split('/').pop() || 'cover.jpg';
        const mimeType = asset.mimeType || 'image/jpeg';
        const data = await uploadCoverPhoto(asset.uri, fileName, mimeType);
        const photoUrl = (data as any).coverPhotoUrl;
        const photoKey = (data as any).coverPhotoKey;
        if (isSchoolControlledProfile) {
          try {
            const response = await authApi.post('/users/me/profile-change-requests', {
              coverPhotoUrl: photoUrl,
              coverPhotoKey: photoKey,
            });
            setPendingProfileChange(response.data?.data || { status: 'PENDING' });
            Alert.alert(
              isPendingApproval ? 'Request updated' : 'Submitted for review',
              isPendingApproval
                ? 'Your pending cover photo change was updated.'
                : 'Your cover photo change is pending admin approval.'
            );
          } catch (error: any) {
            const existingPending = error?.response?.data?.data;
            if (error?.response?.status === 409 && existingPending) {
              setPendingProfileChange(existingPending);
              setLocalCoverPic(null);
              Alert.alert('Pending approval', 'Your last profile update is still waiting for admin approval.');
              return;
            }
            throw error;
          }
          return;
        }
        await updateProfile({ coverPhotoUrl: photoUrl } as any);
        updateUser({ coverPhotoUrl: photoUrl } as any);
        Alert.alert(t('common.success'), t('profile.uploadSuccess'));
      } catch (error) {
        console.error('Upload cover photo error:', error);
        setLocalCoverPic(null);
        Alert.alert(t('common.error'), t('profile.coverUploadErrorMsg'));
      } finally {
        setUploadingCover(false);
      }
    }
  };

  // ── Save Profile ─────────────────────────────────────────────

  const handleSave = async () => {
    if (saving) return;

    try {
      setSaving(true);

      const interests = formData.interests
        .split(',')
        .map(i => i.trim())
        .filter(Boolean);

      const profileData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        englishFirstName: formData.englishFirstName.trim(),
        englishLastName: formData.englishLastName.trim(),
        headline: formData.headline.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
        interests,
        socialLinks: formData.socialLinks,
        customFields: {
          regional: {
            ...Object.fromEntries(
              Object.entries(formData.customFields).map(([key, value]) => [key, value.trim()])
            ),
          },
        },
      };

      if (isSchoolControlledProfile && isProfileLocked) {
        Alert.alert(
          'Profile locked',
          'Your school has locked official profile editing. Please wait until an admin unlocks your profile.'
        );
        return;
      }

      if (isSchoolControlledProfile) {
        try {
          const { data } = await authApi.post('/users/me/profile-change-requests', profileData);
          setPendingProfileChange(data?.data || { status: 'PENDING' });
          Alert.alert(
            isPendingApproval ? 'Request updated' : 'Submitted for review',
            isPendingApproval
              ? 'Your pending profile change request was updated. Admin will review the latest version.'
              : 'Your profile change request is pending admin approval. Your official profile will update after approval.',
            [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
          );
        } catch (error: any) {
          const existingPending = error?.response?.data?.data;
          if (error?.response?.status === 409 && existingPending) {
            setPendingProfileChange(existingPending);
            Alert.alert(
              'Pending approval',
              'Your last profile update is still waiting for admin approval.'
            );
            return;
          }
          throw error;
        }
        return;
      }

      await updateProfile(profileData);

      updateUser({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        englishFirstName: profileData.englishFirstName,
        englishLastName: profileData.englishLastName,
        name: `${profileData.firstName} ${profileData.lastName}`.trim(),
        headline: profileData.headline,
        bio: profileData.bio,
        location: profileData.location,
        interests,
        ...(user?.role === 'TEACHER' ? {
          teacher: {
            ...(user.teacher || {}),
            customFields: {
              ...(user.teacher?.customFields || {}),
              regional: profileData.customFields.regional,
            },
          },
        } : {}),
        ...(user?.role === 'STUDENT' ? {
          student: {
            ...(user.student || {}),
            customFields: {
              ...(user.student?.customFields || {}),
              regional: profileData.customFields.regional,
            },
          },
        } : {}),
      } as any);

      Alert.alert(t('common.success'), t('profile.profileUpdated'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      Alert.alert(t('common.error'), error?.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : t('common.user');
  const pendingRequestedData = pendingProfileChange?.requestedData || {};
  const coverUri = localCoverPic || pendingRequestedData.coverPhotoUrl || user?.coverPhotoUrl;
  const profileUri = localProfilePic || pendingRequestedData.profilePictureUrl || user?.profilePictureUrl;

  return (
    <View style={s.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={saving}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={s.headerTitle}>{t('profile.editProfileTitle')}</Text>

        <TouchableOpacity onPress={handleSave} disabled={saveDisabled}>
          <LinearGradient
            colors={saveDisabled ? ['#94A3B8', '#94A3B8'] : ['#0EA5E9', '#0284C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saveBtn}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveBtnText}>{saveLabel}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Form */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Cover + Avatar ────────────────────────────── */}
          <Animated.View style={s.photoSection}>
            <TouchableOpacity
              style={s.coverTouch}
              onPress={pickCoverPhoto}
              disabled={uploadingCover || isProfileReadOnly}
              activeOpacity={0.85}
            >
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={s.coverImage} />
              ) : (
                <>
                  <LinearGradient
                    colors={coverPlaceholderColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.coverPlaceholder}
                  />
                  <View style={s.coverPlaceholderContent}>
                    <Ionicons name="image-outline" size={28} color={isDark ? colors.textSecondary : '#0284C7'} />
                  </View>
                </>
              )}
              <View style={s.coverBadge}>
                {uploadingCover ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="camera" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <View style={s.avatarWrap}>
              <TouchableOpacity
                onPress={pickProfilePhoto}
                disabled={uploadingPhoto || isProfileReadOnly}
                activeOpacity={0.85}
              >
                <Avatar
                  uri={profileUri}
                  name={fullName}
                  size="2xl"
                  showBorder
                  gradientBorder="blue"
                />
                <View style={s.avatarBadge}>
                  {uploadingPhoto ? (
                    <ActivityIndicator color="#0EA5E9" size="small" />
                  ) : (
                    <Ionicons name="camera" size={14} color="#0EA5E9" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {isSchoolControlledProfile && (
            <View style={s.noticeCard}>
              <View style={s.noticeIcon}>
                <Ionicons
                  name={isPendingApproval ? 'time-outline' : isProfileLocked ? 'lock-closed-outline' : 'shield-checkmark-outline'}
                  size={18}
                  color={isPendingApproval ? '#D97706' : isProfileLocked ? '#64748B' : '#0284C7'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.noticeTitle}>
                  {isPendingApproval
                    ? 'Pending admin approval'
                    : isProfileLocked
                    ? 'Profile editing locked'
                    : 'Changes require admin approval'}
                </Text>
                <Text style={s.noticeText}>
                  {isPendingApproval
                    ? 'You are editing your pending request. Submit again to update what admin will review.'
                    : isProfileLocked
                    ? 'Your school admin must unlock your profile before you can submit changes.'
                    : 'Save will send your updates to the school admin before official records change.'}
                </Text>
              </View>
            </View>
          )}

          {/* ── Name ──────────────────────────────────────── */}
          <Animated.View>
            <View style={s.labelRow}>
              <Text style={s.label}>{t('profile.name')}</Text>
              {isProfileReadOnly && (
                <Text style={{ fontSize: 11, color: isDark ? '#FBBF24' : '#D97706', fontWeight: '600' }}><AutoI18nText i18nKey="auto.mobile.screens_profile_EditProfileScreen.k_c61bb837" /></Text>
              )}
            </View>
            <View style={s.nameRow}>
              <View style={[s.inputWrap, { flex: 1 }, isProfileReadOnly && s.inputDisabled]}>
                <TextInput
                  style={s.input}
                  value={formData.firstName}
                  onChangeText={(t) => setFormData({ ...formData, firstName: t })}
                  placeholder={t('profile.firstName')}
                  placeholderTextColor={colors.textTertiary}
                  editable={!isProfileReadOnly}
                />
              </View>
              <View style={[s.inputWrap, { flex: 1 }, isProfileReadOnly && s.inputDisabled]}>
                <TextInput
                  style={s.input}
                  value={formData.lastName}
                  onChangeText={(t) => setFormData({ ...formData, lastName: t })}
                  placeholder={t('profile.lastName')}
                  placeholderTextColor={colors.textTertiary}
                  editable={!isProfileReadOnly}
                />
              </View>
            </View>
          </Animated.View>

          {/* ── English Name ────────────────────────────────── */}
          <Animated.View>
            <Text style={s.label}><AutoI18nText i18nKey="auto.mobile.screens_profile_EditProfileScreen.k_3f8d1a8b" /></Text>
            <View style={s.nameRow}>
              <View style={[s.inputWrap, { flex: 1 }, isProfileReadOnly && s.inputDisabled]}>
                <TextInput
                  style={s.input}
                  value={formData.englishLastName}
                  onChangeText={(t) => setFormData({ ...formData, englishLastName: t })}
                  placeholder={autoT("auto.mobile.screens_profile_EditProfileScreen.k_4cdcea02")}
                  placeholderTextColor={colors.textTertiary}
                  editable={!isProfileReadOnly}
                />
              </View>
              <View style={[s.inputWrap, { flex: 1 }, isProfileReadOnly && s.inputDisabled]}>
                <TextInput
                  style={s.input}
                  value={formData.englishFirstName}
                  onChangeText={(t) => setFormData({ ...formData, englishFirstName: t })}
                  placeholder={autoT("auto.mobile.screens_profile_EditProfileScreen.k_fd15039a")}
                  placeholderTextColor={colors.textTertiary}
                  editable={!isProfileReadOnly}
                />
              </View>
            </View>
          </Animated.View>

          {/* ── Headline ──────────────────────────────────── */}
          <Animated.View>
            <View style={s.labelRow}>
              <Text style={s.label}>{t('profile.about.headline')}</Text>
              <Text style={s.charCount}>{formData.headline.length}/100</Text>
            </View>
            <View style={[s.inputWrap, isProfileReadOnly && s.inputDisabled]}>
              <TextInput
                style={s.input}
                value={formData.headline}
                onChangeText={(t) => setFormData({ ...formData, headline: t })}
                placeholder={t('profile.headlinePlaceholder')}
                placeholderTextColor={colors.textTertiary}
                maxLength={100}
                editable={!isProfileReadOnly}
              />
            </View>
          </Animated.View>

          {/* ── Bio ───────────────────────────────────────── */}
          <Animated.View>
            <View style={s.labelRow}>
              <Text style={s.label}>{t('profile.about.title')}</Text>
              <Text style={s.charCount}>{formData.bio.length}/500</Text>
            </View>
            <View style={[s.inputWrap, { height: 'auto' }, isProfileReadOnly && s.inputDisabled]}>
              <TextInput
                style={[s.input, { height: 100, paddingTop: 14 }]}
                value={formData.bio}
                onChangeText={(t) => setFormData({ ...formData, bio: t })}
                placeholder={t('profile.aboutPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                multiline
                textAlignVertical="top"
                maxLength={500}
                editable={!isProfileReadOnly}
              />
            </View>
          </Animated.View>

          {/* ── Location ──────────────────────────────────── */}
          <Animated.View>
            <Text style={s.label}>{t('profile.about.location')}</Text>
            <View style={[s.inputWrap, isProfileReadOnly && s.inputDisabled]}>
              <Ionicons name="location-outline" size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                style={s.input}
                value={formData.location}
                onChangeText={(t) => setFormData({ ...formData, location: t })}
                placeholder={t('profile.locationPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                editable={!isProfileReadOnly}
              />
            </View>
          </Animated.View>

          {/* ── Interests ─────────────────────────────────── */}
          <Animated.View>
            <Text style={s.label}>{t('profile.about.interests')}</Text>
            <View style={[s.inputWrap, isProfileReadOnly && s.inputDisabled]}>
              <Ionicons name="pricetag-outline" size={18} color={colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput
                style={s.input}
                value={formData.interests}
                onChangeText={(t) => setFormData({ ...formData, interests: t })}
                placeholder={t('profile.interestsPlaceholder')}
                placeholderTextColor={colors.textTertiary}
                editable={!isProfileReadOnly}
              />
            </View>
            <Text style={s.hint}>{t('profile.interestsHint')}</Text>
          </Animated.View>

          {/* ── Role Details ──────────────────────────────── */}
          {user?.role === 'STUDENT' && (
            <>
              {renderSection(
                'Student identity',
                'MOEYS and school profile information',
                'school-outline',
                <>
                  {renderNativeFullName()}
                  {STUDENT_SCHOOL_FIELDS.map(renderField)}
                </>
              )}
              {renderSection(
                'Family contact',
                'Guardian and parent details',
                'people-outline',
                STUDENT_FAMILY_FIELDS.map(renderField)
              )}
              {renderSection(
                'Exam records',
                'Grade 9 and Grade 12 national exam details',
                'ribbon-outline',
                STUDENT_EXAM_FIELDS.map(renderField)
              )}
            </>
          )}

          {user?.role === 'TEACHER' && (
            <>
              {renderSection(
                'Professional details',
                'MOEYS position, level, and qualification fields',
                'briefcase-outline',
                <>
                  {renderNativeFullName()}
                  {TEACHER_PROFESSIONAL_FIELDS.map(renderField)}
                </>
              )}
              {renderSection(
                'Identity and emergency',
                'Official identifiers and emergency contact',
                'card-outline',
                TEACHER_IDENTITY_FIELDS.map(renderField)
              )}
            </>
          )}

          {/* ── Social Links ──────────────────────────────── */}
          <Animated.View>
            <Text style={s.label}>{t('profile.socialLinks')}</Text>
            {([
              { key: 'github' as const, icon: 'logo-github' as const, color: isDark ? colors.text : '#1F2937', placeholder: t('profile.githubPlaceholder') },
              { key: 'linkedin' as const, icon: 'logo-linkedin' as const, color: '#0A66C2', placeholder: t('profile.linkedinPlaceholder') },
              { key: 'facebook' as const, icon: 'logo-facebook' as const, color: '#1877F2', placeholder: t('profile.facebookPlaceholder') },
              { key: 'portfolio' as const, icon: 'globe-outline' as const, color: colors.textSecondary, placeholder: t('profile.portfolioPlaceholder') },
            ]).map((link) => (
              <View key={link.key} style={s.socialRow}>
                <View style={s.socialIcon}>
                  <Ionicons name={link.icon} size={18} color={link.color} />
                </View>
                <View style={[s.inputWrap, { flex: 1, marginBottom: 0 }, isProfileReadOnly && s.inputDisabled]}>
                  <TextInput
                    style={s.input}
                    value={formData.socialLinks[link.key]}
                    onChangeText={(t) =>
                      setFormData({
                        ...formData,
                        socialLinks: { ...formData.socialLinks, [link.key]: t }
                      })
                    }
                    placeholder={link.placeholder}
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    keyboardType={link.key === 'portfolio' ? 'url' : 'default'}
                    editable={!isProfileReadOnly}
                  />
                </View>
              </View>
            ))}
          </Animated.View>

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // ── Header ────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 14,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // ── Photo Section ─────────────────────────────────────
  photoSection: {
    marginBottom: 24,
    borderRadius: 14,
    overflow: 'visible',
  },
  coverTouch: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: isDark ? colors.surfaceVariant : '#E0F2FE',
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholderContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: -50,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',


    shadowRadius: 4,

  },

  // ── Labels ────────────────────────────────────────────
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
    marginRight: 4,
  },
  charCount: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  hint: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
    marginLeft: 4,
    marginBottom: 12,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    backgroundColor: isDark ? 'rgba(14,165,233,0.10)' : '#F0F9FF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(14,165,233,0.24)' : '#BAE6FD',
  },
  noticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: isDark ? 0 : 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: isDark ? 0 : 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(14,165,233,0.14)' : '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 7,
    marginLeft: 4,
  },

  // ── Inputs ────────────────────────────────────────────
  nameRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 24,
    backgroundColor: isDark ? colors.surfaceVariant : '#F8FAFC',
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputDisabled: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
  },
  readOnlyInputWrap: {
    backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  readOnlyValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  readOnlyPlaceholder: {
    fontWeight: '500',
    color: colors.textTertiary,
  },

  // ── Social Links ──────────────────────────────────────
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: isDark ? colors.surfaceVariant : '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
