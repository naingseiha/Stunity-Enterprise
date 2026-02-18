/**
 * Sidebar Component
 * 
 * Premium sidebar menu — enterprise e-learning design
 * - Gradient profile card matching feed performance card style
 * - Clean menu items with colored icon circles
 * - Refined logout with confirmation
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Dimensions,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '@/components/common';
import { useAuthStore } from '@/stores';

// Import Stunity logo
const StunityLogo = require('../../../../../Stunity.png');

interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  badge?: number;
  onPress: () => void;
}

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

export default function Sidebar({ visible, onClose, onNavigate }: SidebarProps) {
  const { user, logout } = useAuthStore();

  const menuItems: MenuItem[] = [
    {
      key: 'notifications',
      label: 'Notifications',
      icon: 'notifications',
      iconColor: '#F59E0B',
      iconBg: '#FEF3C7',
      badge: 5,
      onPress: () => { onNavigate('Notifications'); onClose(); },
    },
    {
      key: 'events',
      label: 'Events',
      icon: 'calendar',
      iconColor: '#EC4899',
      iconBg: '#FCE7F3',
      onPress: () => { onNavigate('Events'); onClose(); },
    },
    {
      key: 'bookmarks',
      label: 'Saved',
      icon: 'bookmark',
      iconColor: '#6366F1',
      iconBg: '#EEF2FF',
      onPress: () => { onNavigate('Bookmarks'); onClose(); },
    },
    {
      key: 'connections',
      label: 'Connections',
      icon: 'people',
      iconColor: '#10B981',
      iconBg: '#D1FAE5',
      onPress: () => { onNavigate('Connections'); onClose(); },
    },
    {
      key: 'settings',
      label: 'Settings & Privacy',
      icon: 'settings',
      iconColor: '#6B7280',
      iconBg: '#F3F4F6',
      onPress: () => { onNavigate('Settings'); onClose(); },
    },
    {
      key: 'help',
      label: 'Help & Support',
      icon: 'help-circle',
      iconColor: '#3B82F6',
      iconBg: '#DBEAFE',
      onPress: () => { onClose(); },
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => { logout(); onClose(); },
        },
      ],
    );
  };

  const userName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const userRole = user?.role === 'TEACHER' ? 'Teacher'
    : user?.role === 'ADMIN' || user?.role === 'SCHOOL_ADMIN' ? 'Admin'
      : 'Student';

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* Header with Logo and Close */}
        <View style={styles.header}>
          <Image source={StunityLogo} style={styles.logo} resizeMode="contain" />
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Card — Gradient style matching feed performance card */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => { onNavigate('ProfileTab'); onClose(); }}
            style={styles.profileCardWrapper}
          >
            <LinearGradient
              colors={['#818CF8', '#6366F1', '#4F46E5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileCard}
            >
              {/* Avatar */}
              <View style={styles.profileAvatarContainer}>
                <View style={styles.profileAvatarRing}>
                  <Avatar
                    uri={user?.profilePictureUrl}
                    name={userName}
                    size="xl"
                    showBorder={false}
                    gradientBorder="none"
                  />
                </View>
              </View>

              {/* Name & Role */}
              <Text style={styles.profileName}>{userName}</Text>
              <View style={styles.profileRoleBadge}>
                <Ionicons
                  name={userRole === 'Teacher' ? 'school' : userRole === 'Admin' ? 'shield-checkmark' : 'person'}
                  size={12}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.profileRoleText}>{userRole}</Text>
              </View>

              {/* View Profile Link */}
              <View style={styles.viewProfileRow}>
                <Text style={styles.viewProfileText}>View Profile</Text>
                <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" />
              </View>

              {/* Decorative circles */}
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.6}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <View style={styles.menuRight}>
                  {item.badge ? (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.badge}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          {/* App Version */}
          <Text style={styles.versionText}>Stunity v1.0.0</Text>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  logo: {
    width: 120,
    height: 30,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // ── Profile Card ──
  profileCardWrapper: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  profileAvatarContainer: {
    marginBottom: 14,
  },
  profileAvatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  profileRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
    marginBottom: 12,
  },
  profileRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  viewProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewProfileText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle1: {
    width: 120,
    height: 120,
    top: -30,
    right: -20,
  },
  decorCircle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -15,
  },

  // ── Menu Items ──
  menuSection: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  menuIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: -0.2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  menuBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    marginVertical: 12,
  },

  // ── Logout ──
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  logoutIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    letterSpacing: -0.2,
  },

  // ── Footer ──
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: '500',
    marginTop: 20,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 50 : 30,
  },
});
