/**
 * Sidebar Component
 * 
 * Professional sidebar menu with modern enterprise design
 * Clean, sophisticated, and accessible layout
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
            <Ionicons name="close" size={28} color="#374151" />
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
            <Text style={styles.profileName} numberOfLines={1}>
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </Text>
            <View style={styles.profileSubtitleRow}>
              <Text style={styles.profileSubtitle}>View your profile</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.sectionDivider} />

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
                <Ionicons name={item.icon} size={24} color="#374151" />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <View style={styles.menuRight}>
                {item.badge ? (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                ) : null}
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </View>
            </TouchableOpacity>
          ))}

          {/* Help & Support */}
          <TouchableOpacity 
            style={styles.menuItem} 
            activeOpacity={0.6}
          >
            <View style={styles.menuIconWrapper}>
              <Ionicons name="help-circle-outline" size={24} color="#374151" />
            </View>
            <Text style={styles.menuLabel}>Help & Support</Text>
            <View style={styles.menuRight}>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </View>
          </TouchableOpacity>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#FEE2E2', '#FECACA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.logoutGradient}
            >
              <View style={styles.logoutIconWrapper}>
                <Ionicons name="log-out-outline" size={22} color="#DC2626" />
              </View>
              <Text style={styles.logoutText}>Log Out</Text>
              <Ionicons name="arrow-forward" size={20} color="#DC2626" />
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Bottom spacing */}
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logo: {
    width: 120,
    height: 30,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  profileSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 8,
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  menuIconWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: -0.2,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  menuBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  spacer: {
    height: 24,
  },
  logoutButton: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  logoutIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: -0.2,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 50 : 30,
  },
});
