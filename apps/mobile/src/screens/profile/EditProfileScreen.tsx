import { I18nText as AutoI18nText } from '@/components/i18n/I18nText';
/**
 * Edit Profile Screen — Clean Professional Design
 *
 * Flat layout, fully rounded inputs, iOS-style header
 * Photo upload + form fields with API integration
 */

import React, { useState, useEffect } from 'react';
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

export default function EditProfileScreen() {
    const { t: autoT } = useTranslation();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [localProfilePic, setLocalProfilePic] = useState<string | null>(null);
  const [localCoverPic, setLocalCoverPic] = useState<string | null>(null);

  const isProfileLocked = React.useMemo(() => {
    if (user?.role === 'TEACHER') return user?.teacher?.isProfileLocked;
    if (user?.role === 'STUDENT') return user?.student?.isProfileLocked;
    return false;
  }, [user]);

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

  useEffect(() => {
    let mounted = true;

    // Initial hydration from store
    if (user && formData.firstName === '') {
      const sl = (user as any).socialLinks || {};
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        englishFirstName: user.englishFirstName || '',
        englishLastName: user.englishLastName || '',
        headline: user.headline || '',
        bio: user.bio || '',
        location: user.location || '',
        interests: (user.interests || []).join(', '),
        socialLinks: {
          github: sl.github || '',
          linkedin: sl.linkedin || '',
          facebook: sl.facebook || '',
          portfolio: sl.portfolio || '',
        },
        customFields: {
          khmerName: user.role === 'TEACHER' ? (user.teacher?.customFields?.khmerName || '') : (user.student?.customFields?.khmerName || ''),
          position: user.role === 'TEACHER' ? (user.teacher?.customFields?.position || '') : '',
          degree: user.role === 'TEACHER' ? (user.teacher?.customFields?.degree || '') : '',
          parentName: user.role === 'STUDENT' ? (user.student?.customFields?.parentName || '') : '',
          previousSchool: user.role === 'STUDENT' ? (user.student?.customFields?.previousSchool || '') : '',
        },
      });
    }

    // Fetch fresh profile data
    const loadFresh = async () => {
      try {
        const freshProfile = await fetchProfile('me');
        if (mounted && freshProfile) {
          // Sync with store to have coverPhotoUrl
          updateUser(freshProfile as any);

          const sl = (freshProfile as any).socialLinks || {};
          setFormData({
            firstName: freshProfile.firstName || '',
            lastName: freshProfile.lastName || '',
            englishFirstName: freshProfile.englishFirstName || '',
            englishLastName: freshProfile.englishLastName || '',
            headline: freshProfile.headline || '',
            bio: freshProfile.bio || '',
            location: freshProfile.location || '',
            interests: (freshProfile.interests || []).join(', '),
            socialLinks: {
              github: sl.github || '',
              linkedin: sl.linkedin || '',
              facebook: sl.facebook || '',
              portfolio: sl.portfolio || '',
            },
            customFields: {
              khmerName: freshProfile.role === 'TEACHER' ? (freshProfile.teacher?.customFields?.khmerName || '') : (freshProfile.student?.customFields?.khmerName || ''),
              position: freshProfile.role === 'TEACHER' ? (freshProfile.teacher?.customFields?.position || '') : '',
              degree: freshProfile.role === 'TEACHER' ? (freshProfile.teacher?.customFields?.degree || '') : '',
              parentName: freshProfile.role === 'STUDENT' ? (freshProfile.student?.customFields?.parentName || '') : '',
              previousSchool: freshProfile.role === 'STUDENT' ? (freshProfile.student?.customFields?.previousSchool || '') : '',
            },
          });
        }
      } catch (err) {
        // Silently ignore if fetch fails, store data is already hydration fallback
      }
    };

    loadFresh();

    return () => { mounted = false; };
  }, []);

  // ── Photo Pickers ────────────────────────────────────────────

  const pickProfilePhoto = async () => {
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
        customFields: formData.customFields,
      };

      let nameChangeRequested = false;
      let nameChangeRequestFailed = false;
      const namesChanged = 
        profileData.firstName !== (user?.firstName || '') || 
        profileData.lastName !== (user?.lastName || '') ||
        profileData.englishFirstName !== (user?.englishFirstName || '') ||
        profileData.englishLastName !== (user?.englishLastName || '');

      if (namesChanged && isProfileLocked && user) {
        // Submit request to admin when name is locked.
        try {
          await authApi.post('/users/me/profile-change-requests', {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            englishFirstName: profileData.englishFirstName,
            englishLastName: profileData.englishLastName,
          });
          nameChangeRequested = true;
        } catch (e) {
          console.error('Failed to submit name change request', e);
          nameChangeRequestFailed = true;
        }

        // Keep locked identity fields unchanged until admin approval.
        profileData.firstName = user.firstName || '';
        profileData.lastName = user.lastName || '';
        profileData.englishFirstName = user.englishFirstName || '';
        profileData.englishLastName = user.englishLastName || '';
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
      } as any);

      if (nameChangeRequested) {
        Alert.alert(
          t('common.success'), 
          'Your profile was saved. Your name change request was submitted to your admin for approval.', 
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      } else if (nameChangeRequestFailed) {
        Alert.alert(
          t('common.success'),
          'Your profile was saved, but we could not submit your name change request. Please try again.',
          [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(t('common.success'), t('profile.profileUpdated'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      Alert.alert(t('common.error'), error?.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : t('common.user');
  const coverUri = localCoverPic || user?.coverPhotoUrl;
  const profileUri = localProfilePic || user?.profilePictureUrl;

  return (
    <View style={s.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={saving}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <Text style={s.headerTitle}>{t('profile.editProfileTitle')}</Text>

        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <LinearGradient
            colors={saving ? ['#94A3B8', '#94A3B8'] : ['#0EA5E9', '#0284C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.saveBtn}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.saveBtnText}>{t('profile.save')}</Text>
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
              disabled={uploadingCover}
              activeOpacity={0.85}
            >
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={s.coverImage} />
              ) : (
                <LinearGradient
                  colors={['#BAE6FD', '#E0F2FE', '#F0F9FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.coverPlaceholder}
                />
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
                disabled={uploadingPhoto}
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

          {/* ── Name ──────────────────────────────────────── */}
          <Animated.View>
            <View style={s.labelRow}>
              <Text style={s.label}>{t('profile.name')}</Text>
              {isProfileLocked && (
                <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '600' }}><AutoI18nText i18nKey="auto.mobile.screens_profile_EditProfileScreen.k_c61bb837" /></Text>
              )}
            </View>
            <View style={s.nameRow}>
              <View style={[s.inputWrap, { flex: 1 }, isProfileLocked && s.inputDisabled]}>
                <TextInput
                  style={s.input}
                  value={formData.firstName}
                  onChangeText={(t) => setFormData({ ...formData, firstName: t })}
                  placeholder={t('profile.firstName')}
                  placeholderTextColor="#9CA3AF"
                  editable={!isProfileLocked}
                />
              </View>
              <View style={[s.inputWrap, { flex: 1 }, isProfileLocked && s.inputDisabled]}>
                <TextInput
                  style={s.input}
                  value={formData.lastName}
                  onChangeText={(t) => setFormData({ ...formData, lastName: t })}
                  placeholder={t('profile.lastName')}
                  placeholderTextColor="#9CA3AF"
                  editable={!isProfileLocked}
                />
              </View>
            </View>
          </Animated.View>

          {/* ── English Name ────────────────────────────────── */}
          <Animated.View>
            <Text style={s.label}><AutoI18nText i18nKey="auto.mobile.screens_profile_EditProfileScreen.k_3f8d1a8b" /></Text>
            <View style={s.nameRow}>
              <View style={[s.inputWrap, { flex: 1 }, isProfileLocked && s.inputDisabled]}>
                <TextInput
                  style={s.input}
                  value={formData.englishLastName}
                  onChangeText={(t) => setFormData({ ...formData, englishLastName: t })}
                  placeholder={autoT("auto.mobile.screens_profile_EditProfileScreen.k_4cdcea02")}
                  placeholderTextColor="#9CA3AF"
                  editable={!isProfileLocked}
                />
              </View>
              <View style={[s.inputWrap, { flex: 1 }, isProfileLocked && s.inputDisabled]}>
                <TextInput
                  style={s.input}
                  value={formData.englishFirstName}
                  onChangeText={(t) => setFormData({ ...formData, englishFirstName: t })}
                  placeholder={autoT("auto.mobile.screens_profile_EditProfileScreen.k_fd15039a")}
                  placeholderTextColor="#9CA3AF"
                  editable={!isProfileLocked}
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
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                value={formData.headline}
                onChangeText={(t) => setFormData({ ...formData, headline: t })}
                placeholder={t('profile.headlinePlaceholder')}
                placeholderTextColor="#9CA3AF"
                maxLength={100}
              />
            </View>
          </Animated.View>

          {/* ── Bio ───────────────────────────────────────── */}
          <Animated.View>
            <View style={s.labelRow}>
              <Text style={s.label}>{t('profile.about.title')}</Text>
              <Text style={s.charCount}>{formData.bio.length}/500</Text>
            </View>
            <View style={[s.inputWrap, { height: 'auto' }]}>
              <TextInput
                style={[s.input, { height: 100, paddingTop: 14 }]}
                value={formData.bio}
                onChangeText={(t) => setFormData({ ...formData, bio: t })}
                placeholder={t('profile.aboutPlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
            </View>
          </Animated.View>

          {/* ── Location ──────────────────────────────────── */}
          <Animated.View>
            <Text style={s.label}>{t('profile.about.location')}</Text>
            <View style={s.inputWrap}>
              <Ionicons name="location-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={s.input}
                value={formData.location}
                onChangeText={(t) => setFormData({ ...formData, location: t })}
                placeholder={t('profile.locationPlaceholder')}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </Animated.View>

          {/* ── Interests ─────────────────────────────────── */}
          <Animated.View>
            <Text style={s.label}>{t('profile.about.interests')}</Text>
            <View style={s.inputWrap}>
              <Ionicons name="pricetag-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={s.input}
                value={formData.interests}
                onChangeText={(t) => setFormData({ ...formData, interests: t })}
                placeholder={t('profile.interestsPlaceholder')}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <Text style={s.hint}>{t('profile.interestsHint')}</Text>
          </Animated.View>

          {/* ── Regional Details (Custom Fields) ───────────── */}
          {(user?.role === 'TEACHER' || user?.role === 'STUDENT') && (
            <Animated.View>
              <Text style={s.label}>{t('profile.regionalDetails')}</Text>

              <View style={s.inputWrap}>
                <Ionicons name="language-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                <TextInput
                  style={s.input}
                  value={formData.customFields.khmerName || ''}
                  onChangeText={(t) => setFormData({
                    ...formData,
                    customFields: { ...formData.customFields, khmerName: t }
                  })}
                  placeholder={t('profile.khmerNamePlaceholder')}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {user?.role === 'TEACHER' && (
                <>
                  <View style={s.inputWrap}>
                    <Ionicons name="briefcase-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <TextInput
                      style={s.input}
                      value={formData.customFields.position || ''}
                      onChangeText={(t) => setFormData({
                        ...formData,
                        customFields: { ...formData.customFields, position: t }
                      })}
                      placeholder={t('profile.positionPlaceholder')}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={s.inputWrap}>
                    <Ionicons name="school-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <TextInput
                      style={s.input}
                      value={formData.customFields.degree || ''}
                      onChangeText={(t) => setFormData({
                        ...formData,
                        customFields: { ...formData.customFields, degree: t }
                      })}
                      placeholder={t('profile.degreePlaceholder')}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </>
              )}

              {user?.role === 'STUDENT' && (
                <>
                  <View style={s.inputWrap}>
                    <Ionicons name="people-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <TextInput
                      style={s.input}
                      value={formData.customFields.parentName || ''}
                      onChangeText={(t) => setFormData({
                        ...formData,
                        customFields: { ...formData.customFields, parentName: t }
                      })}
                      placeholder={t('profile.parentNamePlaceholder')}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={s.inputWrap}>
                    <Ionicons name="business-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
                    <TextInput
                      style={s.input}
                      value={formData.customFields.previousSchool || ''}
                      onChangeText={(t) => setFormData({
                        ...formData,
                        customFields: { ...formData.customFields, previousSchool: t }
                      })}
                      placeholder={t('profile.previousSchoolPlaceholder')}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </>
              )}
            </Animated.View>
          )}

          {/* ── Social Links ──────────────────────────────── */}
          <Animated.View>
            <Text style={s.label}>{t('profile.socialLinks')}</Text>
            {([
              { key: 'github' as const, icon: 'logo-github' as const, color: '#1F2937', placeholder: t('profile.githubPlaceholder') },
              { key: 'linkedin' as const, icon: 'logo-linkedin' as const, color: '#0A66C2', placeholder: t('profile.linkedinPlaceholder') },
              { key: 'facebook' as const, icon: 'logo-facebook' as const, color: '#1877F2', placeholder: t('profile.facebookPlaceholder') },
              { key: 'portfolio' as const, icon: 'globe-outline' as const, color: '#6B7280', placeholder: t('profile.portfolioPlaceholder') },
            ]).map((link) => (
              <View key={link.key} style={s.socialRow}>
                <View style={s.socialIcon}>
                  <Ionicons name={link.icon} size={18} color={link.color} />
                </View>
                <View style={[s.inputWrap, { flex: 1, marginBottom: 0 }]}>
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
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    keyboardType={link.key === 'portfolio' ? 'url' : 'default'}
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },

  // ── Header ────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
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
    backgroundColor: '#E0F2FE',
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',


    shadowRadius: 4,

  },

  // ── Labels ────────────────────────────────────────────
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
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
    color: '#9CA3AF',
    fontWeight: '500',
  },
  hint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    marginLeft: 4,
    marginBottom: 12,
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
    backgroundColor: '#fff',

    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    height: '100%',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
