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
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        {/* Background blur/overlay */}
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        {/* Sidebar content */}
        <View style={styles.sidebar}>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          
          <View style={styles.container}>
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
                <Text style={styles.profileSubtitle}>View your profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
                  style={[
                    styles.menuItem,
                    index === menuItems.length - 1 && styles.menuItemLast
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.6}
                >
                  <View style={styles.menuIconWrapper}>
                    <Ionicons name={item.icon} size={22} color="#374151" />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.badge ? (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>{item.badge}</Text>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </TouchableOpacity>
              ))}

              {/* Help & Support */}
              <TouchableOpacity 
                style={[styles.menuItem, styles.menuItemLast]} 
                activeOpacity={0.6}
              >
                <View style={styles.menuIconWrapper}>
                  <Ionicons name="help-circle-outline" size={22} color="#374151" />
                </View>
                <Text style={styles.menuLabel}>Help & Support</Text>
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
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
                    <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={styles.logoutText}>Log Out</Text>
                  <Ionicons name="arrow-forward" size={18} color="#DC2626" />
                </LinearGradient>
              </TouchableOpacity>
              
              {/* Bottom spacing */}
              <View style={styles.bottomSpacer} />
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: width * 0.85,
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  logo: {
    width: 110,
    height: 28,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    marginRight: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  profileSubtitle: {
    fontSize: 14,
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
    paddingHorizontal: 20,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  menuBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 'auto',
    marginRight: 8,
  },
  menuBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: -0.1,
  },
  spacer: {
    height: 16,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  logoutIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: -0.1,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 40 : 20,
  },
});
