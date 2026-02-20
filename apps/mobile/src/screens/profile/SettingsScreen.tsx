/**
 * Settings Screen
 *
 * Premium iOS-style settings with:
 * - Smooth spring animations per row
 * - Profile header with "View Profile" action
 * - Animated press scale on each row
 * - Staggered entrance with springify
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    StatusBar,
    Linking,
    Platform,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    SlideInRight,
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    interpolate,
    runOnJS,
} from 'react-native-reanimated';

import { Avatar } from '@/components/common';
import { useAuthStore } from '@/stores';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingItem {
    icon: IoniconsName;
    iconColor: string;
    iconBg: string;
    label: string;
    sublabel?: string;
    type: 'navigate' | 'toggle' | 'action' | 'info';
    value?: boolean;
    onPress?: () => void;
    onToggle?: (val: boolean) => void;
    danger?: boolean;
    badge?: string;
}

interface SettingSection {
    title: string;
    icon: IoniconsName;
    iconColor: string;
    items: SettingItem[];
}

// ── Animated Row Component ───────────────────────────────────────

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function SettingRow({ item, index, sectionDelay }: { item: SettingItem; index: number; sectionDelay: number }) {
    const scale = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    };
    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handlePress = () => {
        if (item.type === 'toggle') return;
        item.onPress?.();
    };

    const enterDelay = sectionDelay + index * 40;

    return (
        <Animated.View
            entering={FadeInDown.delay(enterDelay).duration(350).springify().damping(18).stiffness(200)}
        >
            <AnimatedTouchable
                style={[styles.settingRow, animStyle]}
                activeOpacity={item.type === 'toggle' ? 1 : 0.7}
                onPress={handlePress}
                onPressIn={item.type !== 'toggle' && item.type !== 'info' ? handlePressIn : undefined}
                onPressOut={item.type !== 'toggle' && item.type !== 'info' ? handlePressOut : undefined}
                disabled={item.type === 'info'}
            >
                {/* Icon */}
                <View style={[styles.settingIcon, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                </View>

                {/* Label */}
                <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, item.danger && styles.settingLabelDanger]}>
                        {item.label}
                    </Text>
                    {item.sublabel && (
                        <Text style={styles.settingSublabel} numberOfLines={1}>{item.sublabel}</Text>
                    )}
                </View>

                {/* Right Side */}
                {item.type === 'toggle' && (
                    <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: '#E5E7EB', true: '#7DD3FC' }}
                        thumbColor={item.value ? '#0EA5E9' : '#FAFAFA'}
                        ios_backgroundColor="#E5E7EB"
                        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                    />
                )}
                {item.type === 'navigate' && (
                    <View style={styles.chevronCircle}>
                        <Ionicons name="chevron-forward" size={14} color="#C7D2FE" />
                    </View>
                )}
                {item.type === 'action' && !item.danger && (
                    <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                )}
                {item.badge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                )}
            </AnimatedTouchable>
        </Animated.View>
    );
}

// ── Settings Screen Component ────────────────────────────────────

export default function SettingsScreen() {
    const navigation = useNavigation<any>();
    const { user, logout } = useAuthStore();

    // Toggle states
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [biometrics, setBiometrics] = useState(false);
    const [profileVisibility, setProfileVisibility] = useState(true);
    const [onlineStatus, setOnlineStatus] = useState(true);
    const [autoPlay, setAutoPlay] = useState(true);
    const [hapticFeedback, setHapticFeedback] = useState(true);

    const handleLogout = useCallback(() => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out of your account?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => { await logout(); },
                },
            ]
        );
    }, [logout]);

    const handleDeleteAccount = useCallback(() => {
        Alert.alert(
            'Delete Account',
            'This action is permanent and cannot be undone. All your data, posts, and achievements will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert('Contact Support', 'Please contact support@stunity.com to proceed with account deletion.');
                    },
                },
            ]
        );
    }, []);

    const handleViewProfile = useCallback(() => {
        // Navigate to ProfileTab → Profile screen to ensure correct tab is active
        navigation.navigate('ProfileTab', { screen: 'Profile' });
    }, [navigation]);

    const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';
    const initials = user ? `${(user.firstName?.[0] || '').toUpperCase()}${(user.lastName?.[0] || '').toUpperCase()}` : 'U';
    const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';

    // ── Section Definitions ────────────────────────────────────────

    const sections: SettingSection[] = useMemo(() => [
        {
            title: 'Account',
            icon: 'person-circle-outline' as IoniconsName,
            iconColor: '#3B82F6',
            items: [
                {
                    icon: 'person-outline',
                    iconColor: '#3B82F6',
                    iconBg: '#EFF6FF',
                    label: 'Edit Profile',
                    sublabel: 'Name, bio, photo',
                    type: 'navigate',
                    onPress: () => navigation.navigate('EditProfile'),
                },
                {
                    icon: 'lock-closed-outline',
                    iconColor: '#8B5CF6',
                    iconBg: '#FAF5FF',
                    label: 'Password & Security',
                    sublabel: 'Change password, 2FA',
                    type: 'navigate',
                    onPress: () => Alert.alert('Coming Soon', 'Password & Security settings will be available soon.'),
                },
                {
                    icon: 'finger-print-outline',
                    iconColor: '#10B981',
                    iconBg: '#ECFDF5',
                    label: 'Biometric Login',
                    sublabel: Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint',
                    type: 'toggle',
                    value: biometrics,
                    onToggle: setBiometrics,
                },
                {
                    icon: 'mail-outline',
                    iconColor: '#F97316',
                    iconBg: '#FFF7ED',
                    label: 'Email Address',
                    sublabel: user?.email || 'Not set',
                    type: 'info',
                },
            ],
        },
        {
            title: 'Privacy',
            icon: 'shield-outline' as IoniconsName,
            iconColor: '#06B6D4',
            items: [
                {
                    icon: 'eye-outline',
                    iconColor: '#06B6D4',
                    iconBg: '#ECFEFF',
                    label: 'Profile Visibility',
                    sublabel: 'Who can see your profile',
                    type: 'toggle',
                    value: profileVisibility,
                    onToggle: setProfileVisibility,
                },
                {
                    icon: 'radio-outline',
                    iconColor: '#22C55E',
                    iconBg: '#F0FDF4',
                    label: 'Online Status',
                    sublabel: 'Show when you\'re active',
                    type: 'toggle',
                    value: onlineStatus,
                    onToggle: setOnlineStatus,
                },
                {
                    icon: 'shield-checkmark-outline',
                    iconColor: '#6366F1',
                    iconBg: '#EEF2FF',
                    label: 'Blocked Users',
                    type: 'navigate',
                    onPress: () => Alert.alert('Coming Soon', 'Blocked users management will be available soon.'),
                },
                {
                    icon: 'document-text-outline',
                    iconColor: '#64748B',
                    iconBg: '#F8FAFC',
                    label: 'Privacy Policy',
                    type: 'navigate',
                    onPress: () => Linking.openURL('https://stunity.com/privacy'),
                },
            ],
        },
        {
            title: 'Notifications',
            icon: 'notifications-outline' as IoniconsName,
            iconColor: '#EF4444',
            items: [
                {
                    icon: 'notifications-outline',
                    iconColor: '#EF4444',
                    iconBg: '#FEF2F2',
                    label: 'Push Notifications',
                    sublabel: 'Alerts, messages, updates',
                    type: 'toggle',
                    value: pushNotifications,
                    onToggle: setPushNotifications,
                },
                {
                    icon: 'mail-unread-outline',
                    iconColor: '#0EA5E9',
                    iconBg: '#F0F9FF',
                    label: 'Email Notifications',
                    sublabel: 'Weekly digest, announcements',
                    type: 'toggle',
                    value: emailNotifications,
                    onToggle: setEmailNotifications,
                },
            ],
        },
        {
            title: 'Appearance',
            icon: 'color-palette-outline' as IoniconsName,
            iconColor: '#6366F1',
            items: [
                {
                    icon: 'moon-outline',
                    iconColor: '#6366F1',
                    iconBg: '#EEF2FF',
                    label: 'Dark Mode',
                    sublabel: 'Reduce eye strain',
                    type: 'toggle',
                    value: darkMode,
                    onToggle: setDarkMode,
                },
                {
                    icon: 'play-circle-outline',
                    iconColor: '#EC4899',
                    iconBg: '#FDF2F8',
                    label: 'Auto-play Videos',
                    type: 'toggle',
                    value: autoPlay,
                    onToggle: setAutoPlay,
                },
                {
                    icon: 'phone-portrait-outline',
                    iconColor: '#F59E0B',
                    iconBg: '#FFFBEB',
                    label: 'Haptic Feedback',
                    sublabel: 'Vibration on interactions',
                    type: 'toggle',
                    value: hapticFeedback,
                    onToggle: setHapticFeedback,
                },
            ],
        },
        {
            title: 'Support',
            icon: 'help-buoy-outline' as IoniconsName,
            iconColor: '#10B981',
            items: [
                {
                    icon: 'help-circle-outline',
                    iconColor: '#0EA5E9',
                    iconBg: '#F0F9FF',
                    label: 'Help Center',
                    type: 'navigate',
                    onPress: () => Linking.openURL('https://stunity.com/help'),
                },
                {
                    icon: 'chatbubble-ellipses-outline',
                    iconColor: '#10B981',
                    iconBg: '#ECFDF5',
                    label: 'Contact Support',
                    sublabel: 'Get help from our team',
                    type: 'navigate',
                    onPress: () => Linking.openURL('mailto:support@stunity.com'),
                },
                {
                    icon: 'star-outline',
                    iconColor: '#F59E0B',
                    iconBg: '#FFFBEB',
                    label: 'Rate the App',
                    type: 'navigate',
                    onPress: () => Alert.alert('Thank You!', 'We appreciate your feedback. ❤️'),
                },
                {
                    icon: 'information-circle-outline',
                    iconColor: '#64748B',
                    iconBg: '#F8FAFC',
                    label: 'About',
                    sublabel: 'Version 1.0.0',
                    type: 'navigate',
                    onPress: () => Alert.alert('Stunity Enterprise', 'Version 1.0.0\n\n© 2026 Stunity Inc.\nAll rights reserved.'),
                },
            ],
        },
        {
            title: 'Danger Zone',
            icon: 'warning-outline' as IoniconsName,
            iconColor: '#EF4444',
            items: [
                {
                    icon: 'log-out-outline',
                    iconColor: '#EF4444',
                    iconBg: '#FEF2F2',
                    label: 'Log Out',
                    type: 'action',
                    danger: true,
                    onPress: handleLogout,
                },
                {
                    icon: 'trash-outline',
                    iconColor: '#DC2626',
                    iconBg: '#FEF2F2',
                    label: 'Delete Account',
                    sublabel: 'Permanent action',
                    type: 'action',
                    danger: true,
                    onPress: handleDeleteAccount,
                },
            ],
        },
    ], [biometrics, profileVisibility, onlineStatus, pushNotifications, emailNotifications, darkMode, autoPlay, hapticFeedback, handleLogout, handleDeleteAccount, navigation, user?.email]);

    // ── Render ─────────────────────────────────────────────────────

    let globalItemIndex = 0;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Animated Header */}
            <Animated.View entering={FadeIn.duration(300)}>
                <SafeAreaView edges={['top']} style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={22} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <View style={{ width: 40 }} />
                </SafeAreaView>
            </Animated.View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={true}
            >
                {/* ─── Profile Card ─────────────────────────────────── */}
                <Animated.View entering={FadeInDown.delay(50).duration(500).springify().damping(16)}>
                    <View style={styles.profileCard}>
                        {/* Top: Avatar + Info */}
                        <View style={styles.profileTop}>
                            <Avatar
                                uri={user?.profilePictureUrl}
                                name={fullName}
                                size="lg"
                                showBorder
                                gradientBorder="blue"
                            />
                            <View style={styles.profileInfo}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.profileName}>{fullName}</Text>
                                    <View style={styles.verifiedDot}>
                                        <Ionicons name="checkmark" size={10} color="#fff" />
                                    </View>
                                </View>
                                <Text style={styles.profileEmail} numberOfLines={1}>{user?.email}</Text>
                                <View style={styles.metaRow}>
                                    <View style={styles.rolePill}>
                                        <Text style={styles.roleText}>{user?.role?.replace('_', ' ') || 'Student'}</Text>
                                    </View>
                                    <Text style={styles.memberSince}>Member since {memberSince}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Mini Stats */}
                        <View style={styles.miniStats}>
                            <View style={styles.miniStatItem}>
                                <Text style={styles.miniStatValue}>—</Text>
                                <Text style={styles.miniStatLabel}>Posts</Text>
                            </View>
                            <View style={styles.miniStatDivider} />
                            <View style={styles.miniStatItem}>
                                <Text style={styles.miniStatValue}>—</Text>
                                <Text style={styles.miniStatLabel}>Courses</Text>
                            </View>
                            <View style={styles.miniStatDivider} />
                            <View style={styles.miniStatItem}>
                                <Text style={styles.miniStatValue}>—</Text>
                                <Text style={styles.miniStatLabel}>Level</Text>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.profileActions}>
                            <TouchableOpacity
                                style={styles.profileActionBtn}
                                onPress={handleViewProfile}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="person-outline" size={16} color="#0EA5E9" />
                                <Text style={styles.profileActionText}>View Profile</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.profileActionBtn, styles.profileActionBtnPrimary]}
                                onPress={() => navigation.navigate('EditProfile')}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={16} color="#fff" />
                                <Text style={[styles.profileActionText, { color: '#fff' }]}>Edit Profile</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>

                {/* ─── Quick Stats Row ──────────────────────────────── */}
                <Animated.View
                    entering={FadeInDown.delay(120).duration(400).springify().damping(16)}
                    style={styles.quickStatsRow}
                >
                    <QuickStat icon="bookmark-outline" label="Bookmarks" color="#6366F1" onPress={() => navigation.navigate('Bookmarks')} />
                    <QuickStat icon="document-text-outline" label="My Posts" color="#EC4899" onPress={() => navigation.navigate('MyPosts')} />
                    <QuickStat icon="people-outline" label="Connections" color="#10B981" onPress={() => navigation.navigate('Connections', { type: 'followers' })} />
                    <QuickStat icon="trophy-outline" label="Achievements" color="#F59E0B" onPress={() => Alert.alert('Coming Soon', 'Achievements section will be available soon.')} />
                </Animated.View>

                {/* ─── Settings Sections ─────────────────────────────── */}
                {sections.map((section, sectionIdx) => {
                    const sectionDelay = 200 + sectionIdx * 80;
                    const sectionItems = section.items;

                    return (
                        <View key={section.title}>
                            {/* Section Title */}
                            <Animated.View
                                entering={FadeInDown.delay(sectionDelay - 30).duration(350).springify().damping(18)}
                                style={styles.sectionTitleRow}
                            >
                                <View style={[styles.sectionTitleIcon, { backgroundColor: section.iconColor + '15' }]}>
                                    <Ionicons name={section.icon} size={14} color={section.iconColor} />
                                </View>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                            </Animated.View>

                            {/* Section Card */}
                            <View style={[styles.sectionCard, section.title === 'Danger Zone' && styles.dangerCard]}>
                                {sectionItems.map((item, itemIdx) => {
                                    const currentGlobalIdx = globalItemIndex++;
                                    return (
                                        <React.Fragment key={item.label}>
                                            {itemIdx > 0 && <View style={styles.divider} />}
                                            <SettingRow item={item} index={itemIdx} sectionDelay={sectionDelay} />
                                        </React.Fragment>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}

                {/* ─── Footer ───────────────────────────────────────── */}
                <Animated.View
                    entering={FadeInDown.delay(800).duration(500).springify()}
                    style={styles.footer}
                >
                    <View style={styles.footerLogoRow}>
                        <LinearGradient
                            colors={['#0EA5E9', '#6366F1']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.footerLogo}
                        >
                            <Text style={styles.footerLogoText}>S</Text>
                        </LinearGradient>
                    </View>
                    <Text style={styles.footerText}>Stunity Enterprise</Text>
                    <Text style={styles.footerVersion}>Version 1.0.0 · Build 2026.02</Text>
                    <Text style={styles.footerSubtext}>Made with ❤️ for learners everywhere</Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ── Quick Stat Button ────────────────────────────────────────────

function QuickStat({ icon, label, color, onPress }: { icon: IoniconsName; label: string; color: string; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.quickStatBtn} activeOpacity={0.7} onPress={onPress}>
            <View style={[styles.quickStatIcon, { backgroundColor: color + '12' }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.quickStatLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F4F8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 6,
        backgroundColor: '#F8FAFC',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        
        
        
        
        
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        letterSpacing: -0.3,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 50,
    },

    // ── Profile Card
    profileCard: {
        backgroundColor: '#fff',
        
        
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
        shadowColor: '#000',
        
        shadowOpacity: 0.05,
        
        
    },
    profileTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    profileInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        letterSpacing: -0.3,
    },
    verifiedDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#0EA5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileEmail: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    rolePill: {
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    roleText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#0284C7',
        textTransform: 'capitalize',
    },
    memberSince: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    miniStats: {
        flexDirection: 'row',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    miniStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    miniStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    miniStatLabel: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2,
    },
    miniStatDivider: {
        width: 1,
        height: 28,
        backgroundColor: '#F1F5F9',
    },
    profileActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    profileActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        
        
    },
    profileActionBtnPrimary: {
        backgroundColor: '#0EA5E9',
    },
    profileActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0EA5E9',
    },

    // ── Quick Stats
    quickStatsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 6,
    },
    quickStatBtn: {
        flex: 1,
        backgroundColor: '#fff',
        
        
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 6,
        
        
        shadowOpacity: 0.04,
        shadowRadius: 4,
        
    },
    quickStatIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickStatLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: '#6B7280',
        textAlign: 'center',
        letterSpacing: 0.2,
    },

    // ── Section
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 22,
        marginBottom: 8,
        marginLeft: 2,
    },
    sectionTitleIcon: {
        width: 24,
        height: 24,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    sectionCard: {
        backgroundColor: '#fff',
        
        
        borderRadius: 14,
        overflow: 'hidden',
        
        
        shadowOpacity: 0.04,
        
        
    },
    dangerCard: {
        backgroundColor: '#FFFBFB',
        
        borderColor: '#FEE2E2',
    },

    // ── Setting Row
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 13,
        gap: 12,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingContent: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#1F2937',
        letterSpacing: -0.1,
    },
    settingLabelDanger: {
        color: '#EF4444',
        fontWeight: '600',
    },
    settingSublabel: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 1,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#F1F5F9',
        marginLeft: 62,
    },
    chevronCircle: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Badge
    badge: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 22,
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },

    // ── Footer
    footer: {
        alignItems: 'center',
        paddingVertical: 32,
        gap: 4,
    },
    footerLogoRow: {
        marginBottom: 8,
    },
    footerLogo: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerLogoText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#fff',
    },
    footerText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#CBD5E1',
        letterSpacing: -0.2,
    },
    footerVersion: {
        fontSize: 12,
        color: '#D1D5DB',
    },
    footerSubtext: {
        fontSize: 12,
        color: '#E2E8F0',
        marginTop: 2,
    },
});
