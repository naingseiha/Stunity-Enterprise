/**
 * Edit Profile Screen
 * 
 * Full profile editing with photo upload, name editing, and API integration
 * Uses expo-image-picker for photo selection and profileApi for persistence
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
import { Shadows } from '@/config';
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

interface SectionProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  delay?: number;
}

function Section({ icon, iconColor, iconBg, title, subtitle, children, delay = 0 }: SectionProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={styles.section}
    >
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <View style={styles.sectionTitleWrapper}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </Animated.View>
  );
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

      // Parse interests
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

      const updatedProfile = await updateProfile(profileData);

      // Update local auth store with new data
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
  const coverUri = localCoverPic || (user as any)?.coverPhotoUrl;
  const profileUri = localProfilePic || user?.profilePictureUrl;

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            disabled={saving}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleWrapper}>
            <Ionicons name="person-circle-outline" size={20} color="#0EA5E9" />
            <Text style={styles.headerTitle}>Edit Profile</Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButtonWrapper}
          >
            <LinearGradient
              colors={['#0EA5E9', '#0284C7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButton}
            >
              {saving ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.saveButtonText}>Saving...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Form Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover Photo Section */}
          <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.coverSection}>
            <TouchableOpacity
              style={styles.coverTouchable}
              onPress={pickCoverPhoto}
              disabled={uploadingCover}
              activeOpacity={0.8}
            >
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImage} />
              ) : (
                <LinearGradient
                  colors={['#BAE6FD', '#E0F2FE', '#F0F9FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.coverPlaceholder}
                />
              )}
              <View style={styles.coverOverlay}>
                {uploadingCover ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={styles.coverOverlayText}>Change Cover</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Avatar Overlay */}
            <View style={styles.avatarOverlayWrap}>
              <TouchableOpacity
                onPress={pickProfilePhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.8}
                style={styles.avatarTouchable}
              >
                <Avatar
                  uri={profileUri}
                  name={fullName}
                  size="xl"
                  showBorder
                  gradientBorder="orange"
                />
                <View style={styles.avatarCameraBadge}>
                  {uploadingPhoto ? (
                    <ActivityIndicator color="#0EA5E9" size="small" />
                  ) : (
                    <Ionicons name="camera" size={16} color="#0EA5E9" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Name Section */}
          <Section
            icon="person-outline"
            iconColor="#0EA5E9"
            iconBg="#E0F2FE"
            title="Name"
            subtitle="Your display name"
            delay={100}
          >
            <View style={styles.nameRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={formData.firstName}
                onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                placeholder="First name"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={formData.lastName}
                onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                placeholder="Last name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </Section>

          {/* Headline Section */}
          <Section
            icon="briefcase-outline"
            iconColor="#A855F7"
            iconBg="#F3E8FF"
            title="Headline"
            subtitle="Your professional title or role"
            delay={150}
          >
            <TextInput
              style={styles.input}
              value={formData.headline}
              onChangeText={(text) => setFormData({ ...formData, headline: text })}
              placeholder="e.g., Computer Science Student"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.inputHint}>Appears below your name</Text>
              <Text style={styles.charCount}>{formData.headline.length}/100</Text>
            </View>
          </Section>

          {/* Bio Section */}
          <Section
            icon="document-text-outline"
            iconColor="#3B82F6"
            iconBg="#DBEAFE"
            title="About Me"
            subtitle="Tell others about yourself"
            delay={200}
          >
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Write a brief bio about yourself, your interests, achievements, and goals..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.inputHint}>Share your story</Text>
              <Text style={styles.charCount}>{formData.bio.length}/500</Text>
            </View>
          </Section>

          {/* Location Section */}
          <Section
            icon="location-outline"
            iconColor="#10B981"
            iconBg="#D1FAE5"
            title="Location"
            subtitle="Where are you based?"
            delay={250}
          >
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholder="e.g., Phnom Penh, Cambodia"
              placeholderTextColor="#9CA3AF"
            />
          </Section>

          {/* Interests Section */}
          <Section
            icon="pricetag-outline"
            iconColor="#EC4899"
            iconBg="#FCE7F3"
            title="Interests"
            subtitle="What are you passionate about?"
            delay={300}
          >
            <TextInput
              style={styles.input}
              value={formData.interests}
              onChangeText={(text) => setFormData({ ...formData, interests: text })}
              placeholder="e.g., Programming, Design, Music"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.inputHint}>Separate with commas</Text>
          </Section>

          {/* Social Links Section */}
          <Section
            icon="link-outline"
            iconColor="#0EA5E9"
            iconBg="#E0F2FE"
            title="Social Links"
            subtitle="Connect your profiles"
            delay={350}
          >
            <View style={styles.socialLinksContainer}>
              <View style={styles.socialLinkRow}>
                <View style={styles.socialLinkIcon}>
                  <Ionicons name="logo-github" size={18} color="#1a1a1a" />
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={formData.socialLinks.github}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, github: text }
                    })
                  }
                  placeholder="GitHub username"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <View style={styles.socialLinkIcon}>
                  <Ionicons name="logo-linkedin" size={18} color="#0A66C2" />
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={formData.socialLinks.linkedin}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, linkedin: text }
                    })
                  }
                  placeholder="LinkedIn username"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <View style={styles.socialLinkIcon}>
                  <Ionicons name="logo-facebook" size={18} color="#1877F2" />
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={formData.socialLinks.facebook}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, facebook: text }
                    })
                  }
                  placeholder="Facebook profile"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.socialLinkRow}>
                <View style={styles.socialLinkIcon}>
                  <Ionicons name="globe-outline" size={18} color="#6B7280" />
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={formData.socialLinks.portfolio}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...formData.socialLinks, portfolio: text }
                    })
                  }
                  placeholder="Portfolio website"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </View>
          </Section>

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  headerTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  saveButtonWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // ── Cover Photo ──
  coverSection: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Shadows.sm,
  },
  coverTouchable: {
    height: 160,
    position: 'relative',
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
  coverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverOverlayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  avatarOverlayWrap: {
    alignItems: 'center',
    marginTop: -40,
    marginBottom: 16,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...Shadows.sm,
  },

  // ── Name Row ──
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // ── Sections ──
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleWrapper: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  inputHint: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  charCount: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  socialLinksContainer: {
    gap: 12,
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  socialLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
});
