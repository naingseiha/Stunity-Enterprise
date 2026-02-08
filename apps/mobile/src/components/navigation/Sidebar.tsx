/**
 * Sidebar Component
 * 
 * Modern sidebar menu with Instagram/Facebook inspired design
 * Clean, professional, and beautiful layout
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '@/components/common';
import { Colors, Typography, Shadows } from '@/config';
import { useAuthStore } from '@/stores';

// Import Stunity logo
const StunityLogo = require('../../../../../Stunity.png');

const { width } = Dimensions.get('window');

interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
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
      badge: 5,
      onPress: () => {
        onNavigate('Notifications');
        onClose();
      },
    },
    {
      key: 'events',
      label: 'Events',
      icon: 'calendar',
      onPress: () => {
        onNavigate('Events');
        onClose();
      },
    },
    {
      key: 'bookmarks',
      label: 'Saved',
      icon: 'bookmark',
      onPress: () => {
        onNavigate('Bookmarks');
        onClose();
      },
    },
    {
      key: 'connections',
      label: 'Connections',
      icon: 'people',
      onPress: () => {
        onNavigate('Connections');
        onClose();
      },
    },
    {
      key: 'settings',
      label: 'Settings & Privacy',
      icon: 'settings',
      onPress: () => {
        onNavigate('Settings');
        onClose();
      },
    },
  ];

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.safeArea}>
        <View style={styles.statusBarSpacer} />
        <View style={styles.container}>
            {/* Header with Logo and Close */}
            <View style={styles.header}>
              <Image source={StunityLogo} style={styles.logo} resizeMode="contain" />
              <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={26} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            {/* User Profile Section */}
            <TouchableOpacity
              style={styles.profileSection}
              onPress={() => {
                onNavigate('ProfileTab');
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Avatar
                uri={user?.profilePictureUrl}
                name={user ? `${user.firstName} ${user.lastName}` : 'User'}
                size="xl"
                showBorder
                gradientBorder="orange"
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user ? `${user.firstName} ${user.lastName}` : 'User'}
                </Text>
                <Text style={styles.profileSubtitle}>View your profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Menu Items */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.menuScroll}
              contentContainerStyle={styles.menuContent}
            >
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.menuItem}
                  onPress={item.onPress}
                  activeOpacity={0.6}
                >
                  <View style={styles.menuIconWrapper}>
                    <Ionicons name={item.icon} size={22} color="#1a1a1a" />
                    {item.badge ? (
                      <View style={styles.menuBadge}>
                        <Text style={styles.menuBadgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}

              {/* Help & Support */}
              <TouchableOpacity style={styles.menuItem} activeOpacity={0.6}>
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="help-circle-outline" size={22} color="#1a1a1a" />
                </View>
                <Text style={styles.menuLabel}>Help & Support</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <View style={styles.logoutContent}>
                  <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                  <Text style={styles.logoutText}>Log Out</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  statusBarSpacer: {
    height: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  logo: {
    width: 120,
    height: 32,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  profileSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },
  divider: {
    height: 8,
    backgroundColor: '#F3F4F6',
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  menuIconWrapper: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
  },
  menuBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  menuBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
});
