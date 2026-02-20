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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';

import { useAuthStore } from '@/stores';
import { Avatar } from '@/components/common';
import { ProfileStackScreenProps } from '@/navigation/types';
import { updateProfile, uploadProfilePhoto, uploadCoverPhoto } from '@/api/profileApi';

type NavigationProp = ProfileStackScreenProps<'EditProfile'>['navigation'];

interface FormData {
  firstName: string;
  lastName: string;
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
}

export default function EditProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [localProfilePic, setLocalProfilePic] = useState<string | null>(null);
  const [localCoverPic, setLocalCoverPic] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
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
  });

  useEffect(() => {
    if (user) {
      const sl = (user as any).socialLinks || {};
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
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
      });
    }
  }, [user]);

  // ── Photo Pickers ────────────────────────────────────────────

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow access to your photo library.');
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
        updateUser({ profilePictureUrl: data.profilePictureUrl });
        Alert.alert('Success', 'Profile photo updated!');
      } catch (error) {
        console.error('Upload profile photo error:', error);
        setLocalProfilePic(null);
        Alert.alert('Error', 'Failed to upload profile photo. Please try again.');
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const pickCoverPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow access to your photo library.');
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
        updateUser({ coverPhotoUrl: data.coverPhotoUrl } as any);
        Alert.alert('Success', 'Cover photo updated!');
      } catch (error) {
        console.error('Upload cover photo error:', error);
        setLocalCoverPic(null);
        Alert.alert('Error', 'Failed to upload cover photo. Please try again.');
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
        headline: formData.headline.trim(),
        bio: formData.bio.trim(),
        location: formData.location.trim(),
        interests,
        socialLinks: formData.socialLinks,
      };

      await updateProfile(profileData);

      updateUser({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        name: `${profileData.firstName} ${profileData.lastName}`.trim(),
        headline: profileData.headline,
        bio: profileData.bio,
        location: profileData.location,
        interests,
      } as any);

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';
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

        <Text style={s.headerTitle}>Edit Profile</Text>

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
              <Text style={s.saveBtnText}>Save</Text>
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
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={s.photoSection}>
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
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={s.label}>Name</Text>
            <View style={s.nameRow}>
              <View style={[s.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={s.input}
                  value={formData.firstName}
                  onChangeText={(t) => setFormData({ ...formData, firstName: t })}
                  placeholder="First"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={[s.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={s.input}
                  value={formData.lastName}
                  onChangeText={(t) => setFormData({ ...formData, lastName: t })}
                  placeholder="Last"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          </Animated.View>

          {/* ── Headline ──────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <View style={s.labelRow}>
              <Text style={s.label}>Headline</Text>
              <Text style={s.charCount}>{formData.headline.length}/100</Text>
            </View>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                value={formData.headline}
                onChangeText={(t) => setFormData({ ...formData, headline: t })}
                placeholder="e.g., Computer Science Student"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
              />
            </View>
          </Animated.View>

          {/* ── Bio ───────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <View style={s.labelRow}>
              <Text style={s.label}>About</Text>
              <Text style={s.charCount}>{formData.bio.length}/500</Text>
            </View>
            <View style={[s.inputWrap, { height: 'auto' }]}>
              <TextInput
                style={[s.input, { height: 100, paddingTop: 14 }]}
                value={formData.bio}
                onChangeText={(t) => setFormData({ ...formData, bio: t })}
                placeholder="Write a brief bio about yourself..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
            </View>
          </Animated.View>

          {/* ── Location ──────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <Text style={s.label}>Location</Text>
            <View style={s.inputWrap}>
              <Ionicons name="location-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={s.input}
                value={formData.location}
                onChangeText={(t) => setFormData({ ...formData, location: t })}
                placeholder="e.g., Phnom Penh, Cambodia"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </Animated.View>

          {/* ── Interests ─────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text style={s.label}>Interests</Text>
            <View style={s.inputWrap}>
              <Ionicons name="pricetag-outline" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={s.input}
                value={formData.interests}
                onChangeText={(t) => setFormData({ ...formData, interests: t })}
                placeholder="e.g., Programming, Design, Music"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <Text style={s.hint}>Separate with commas</Text>
          </Animated.View>

          {/* ── Social Links ──────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)}>
            <Text style={s.label}>Social Links</Text>
            {([
              { key: 'github' as const, icon: 'logo-github' as const, color: '#1F2937', placeholder: 'GitHub username' },
              { key: 'linkedin' as const, icon: 'logo-linkedin' as const, color: '#0A66C2', placeholder: 'LinkedIn username' },
              { key: 'facebook' as const, icon: 'logo-facebook' as const, color: '#1877F2', placeholder: 'Facebook profile' },
              { key: 'portfolio' as const, icon: 'globe-outline' as const, color: '#6B7280', placeholder: 'Portfolio URL' },
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
