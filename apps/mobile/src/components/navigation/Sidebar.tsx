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
import { Avatar } from '@/components/common';
import { useAuthStore } from '@/stores';

import StunityLogo from '../../../assets/Stunity.svg';

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
      key: 'leaderboard',
      label: 'Leaderboard',
      icon: 'podium',
      iconColor: '#8B5CF6',
      iconBg: '#EDE9FE',
      onPress: () => { onNavigate('Leaderboard'); onClose(); },
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
          <StunityLogo width={120} height={30} />
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
          {/* Profile Card */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => { onNavigate('ProfileTab'); onClose(); }}
            style={styles.profileCard}
          >
            <Avatar
              uri={user?.profilePictureUrl}
              name={userName}
              size="lg"
              showBorder={false}
              gradientBorder="none"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userName}</Text>
              <View style={styles.profileRoleBadge}>
                <Ionicons
                  name={userRole === 'Teacher' ? 'school' : userRole === 'Admin' ? 'shield-checkmark' : 'person'}
                  size={11}
                  color="#0EA5E9"
                />
                <Text style={styles.profileRoleText}>{userRole}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  profileRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    alignSelf: 'flex-start',
  },
  profileRoleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0EA5E9',
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
