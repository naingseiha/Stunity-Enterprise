/**
 * Settings Screen
 *
 * Premium iOS-style settings with:
 * - Smooth spring animations per row
 * - Profile header with "View Profile" action
 * - Animated press scale on each row
 * - Staggered entrance with springify
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Alert,
    StatusBar,
    Linking,
    Platform,
    Dimensions,
    Animated,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/common';
import { useAuthStore } from '@/stores';
import { LanguageSelector } from '@/components/LanguageSelector';
import { updateProfile as updateProfileApi } from '@/api/profileApi';
import tokenService from '@/services/token';
import StunityLogo from '../../../assets/Stunity.svg';

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


function SettingRow({ item, index, sectionDelay }: { item: SettingItem; index: number; sectionDelay: number }) {
    const scale = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (item.type !== 'toggle' && item.type !== 'info') {
            Animated.spring(scale, { toValue: 0.97, friction: 5, tension: 300, useNativeDriver: true }).start();
        }
    };
    const handlePressOut = () => {
        if (item.type !== 'toggle' && item.type !== 'info') {
            Animated.spring(scale, { toValue: 1, friction: 5, tension: 300, useNativeDriver: true }).start();
        }
    };

    const handlePress = () => {
        if (item.type === 'toggle') return;
        item.onPress?.();
    };

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                style={styles.settingRow}
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
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Settings Screen Component ────────────────────────────────────

export default function SettingsScreen() {
    const navigation = useNavigation<any>();
    const { user, logout, updateUser } = useAuthStore();
    const { t, i18n } = useTranslation();

    // Language selector state
    const [languageSelectorVisible, setLanguageSelectorVisible] = useState(false);

    // Toggle states
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [biometrics, setBiometrics] = useState(false);
    const [profileVisibility, setProfileVisibility] = useState(true);
    const [onlineStatus, setOnlineStatus] = useState(true);
    const [autoPlay, setAutoPlay] = useState(true);
    const [hapticFeedback, setHapticFeedback] = useState(true);

    useEffect(() => {
        setProfileVisibility(user?.profileVisibility !== 'PRIVATE');
        setOnlineStatus(user?.isOnline ?? true);
    }, [user?.profileVisibility, user?.isOnline]);

    useEffect(() => {
        let mounted = true;

        const loadBiometricPreference = async () => {
            try {
                const enabled = await tokenService.isBiometricEnabled();
                if (mounted) {
                    setBiometrics(enabled);
                }
            } catch (error) {
                if (mounted) {
                    setBiometrics(false);
                }
            }
        };

        void loadBiometricPreference();

        return () => {
            mounted = false;
        };
    }, []);

    const handleLogout = useCallback(() => {
        Alert.alert(
            t('common.logout'),
            'Are you sure you want to log out of your account?',
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.logout'),
                    style: 'destructive',
                    onPress: async () => { await logout(); },
                },
            ]
        );
    }, [logout, t]);

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

    const openExternalLink = useCallback(async (url: string) => {
        try {
            await Linking.openURL(url);
        } catch (error) {
            Alert.alert(t('common.error'), 'Unable to open this link right now.');
        }
    }, [t]);

    const openSupportEmail = useCallback((subject: string, body?: string) => {
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = body ? `&body=${encodeURIComponent(body)}` : '';
        void openExternalLink(`mailto:support@stunity.com?subject=${encodedSubject}${encodedBody}`);
    }, [openExternalLink]);

    const openAchievements = useCallback(() => {
        navigation.navigate('Achievements');
    }, [navigation]);

    const handleBiometricsToggle = useCallback(async (enabled: boolean) => {
        setBiometrics(enabled);
        try {
            await tokenService.setBiometricEnabled(enabled);
        } catch (error) {
            setBiometrics(!enabled);
            Alert.alert(t('common.error'), 'Failed to update biometric preference.');
        }
    }, [t]);

    const handleProfileVisibilityToggle = useCallback(async (enabled: boolean) => {
        const previous = profileVisibility;
        const nextVisibility = enabled ? 'PUBLIC' : 'PRIVATE';

        setProfileVisibility(enabled);
        updateUser({ profileVisibility: nextVisibility });

        try {
            await updateProfileApi({ profileVisibility: nextVisibility });
        } catch (error) {
            setProfileVisibility(previous);
            updateUser({ profileVisibility: previous ? 'PUBLIC' : 'PRIVATE' });
            Alert.alert(t('common.error'), 'Failed to update profile visibility.');
        }
    }, [profileVisibility, t, updateUser]);

    const handleOnlineStatusToggle = useCallback((enabled: boolean) => {
        setOnlineStatus(enabled);
        updateUser({ isOnline: enabled });
    }, [updateUser]);

    const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';
    const initials = user ? `${(user.firstName?.[0] || '').toUpperCase()}${(user.lastName?.[0] || '').toUpperCase()}` : 'U';
    const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently';

    // ── Section Definitions ────────────────────────────────────────

    const sections: SettingSection[] = useMemo(() => [
        {
            title: t('common.language'),
            icon: 'language-outline' as IoniconsName,
            iconColor: '#00A99D',
            items: [
                {
                    icon: 'globe-outline',
                    iconColor: '#00A99D',
                    iconBg: '#F0FFFE',
                    label: t('common.language'),
                    sublabel: i18n.language === 'km' ? 'ភាសាខ្មែរ (Khmer)' : 'English',
                    type: 'action',
                    onPress: () => setLanguageSelectorVisible(true),
                },
            ],
        },
        {
            title: t('settings.account'),
            icon: 'person-circle-outline' as IoniconsName,
            iconColor: '#3B82F6',
            items: [
                {
                    icon: 'person-outline',
                    iconColor: '#3B82F6',
                    iconBg: '#EFF6FF',
                    label: t('settings.editProfile'),
                    sublabel: t('settings.editProfileSub'),
                    type: 'navigate',
                    onPress: () => navigation.navigate('EditProfile'),
                },
                {
                    icon: 'lock-closed-outline',
                    iconColor: '#8B5CF6',
                    iconBg: '#FAF5FF',
                    label: t('settings.passwordSecurity'),
                    sublabel: t('settings.passwordSecuritySub'),
                    type: 'navigate',
                    onPress: () => navigation.navigate('PasswordSecurity'),
                },
                {
                    icon: 'finger-print-outline',
                    iconColor: '#10B981',
                    iconBg: '#ECFDF5',
                    label: t('settings.biometricLogin'),
                    sublabel: Platform.OS === 'ios' ? t('settings.biometricSubIos') : t('settings.biometricSubAndroid'),
                    type: 'toggle',
                    value: biometrics,
                    onToggle: (enabled) => {
                        void handleBiometricsToggle(enabled);
                    },
                },
                {
                    icon: 'mail-outline',
                    iconColor: '#F97316',
                    iconBg: '#FFF7ED',
                    label: t('common.email'),
                    sublabel: user?.email || 'Not set',
                    type: 'info',
                },
            ],
        },
        {
            title: t('settings.privacy'),
            icon: 'shield-outline' as IoniconsName,
            iconColor: '#06B6D4',
            items: [
                {
                    icon: 'eye-outline',
                    iconColor: '#06B6D4',
                    iconBg: '#ECFEFF',
                    label: t('settings.profileVisibility'),
                    sublabel: t('settings.profileVisibilitySub'),
                    type: 'toggle',
                    value: profileVisibility,
                    onToggle: (enabled) => {
                        void handleProfileVisibilityToggle(enabled);
                    },
                },
                {
                    icon: 'radio-outline',
                    iconColor: '#22C55E',
                    iconBg: '#F0FDF4',
                    label: t('settings.onlineStatus'),
                    sublabel: t('settings.onlineStatusSub'),
                    type: 'toggle',
                    value: onlineStatus,
                    onToggle: handleOnlineStatusToggle,
                },
                {
                    icon: 'shield-checkmark-outline',
                    iconColor: '#6366F1',
                    iconBg: '#EEF2FF',
                    label: t('settings.blockedUsers'),
                    type: 'navigate',
                    onPress: () => openSupportEmail(
                        'Blocked users management request',
                        `Hello Support,\n\nPlease help me review or update blocked users on my account (${user?.email || 'unknown-email'}).\n\nThank you.`
                    ),
                },
                {
                    icon: 'document-text-outline',
                    iconColor: '#64748B',
                    iconBg: '#F8FAFC',
                    label: t('auth.privacyPolicy'),
                    type: 'navigate',
                    onPress: () => {
                        void openExternalLink('https://stunity.com/privacy');
                    },
                },
            ],
        },
        {
            title: t('common.notifications'),
            icon: 'notifications-outline' as IoniconsName,
            iconColor: '#EF4444',
            items: [
                {
                    icon: 'notifications-outline',
                    iconColor: '#EF4444',
                    iconBg: '#FEF2F2',
                    label: t('common.notifications') + ' (Push)',
                    sublabel: 'Alerts, messages, updates',
                    type: 'toggle',
                    value: pushNotifications,
                    onToggle: setPushNotifications,
                },
                {
                    icon: 'mail-unread-outline',
                    iconColor: '#0EA5E9',
                    iconBg: '#F0F9FF',
                    label: t('common.notifications') + ' (Email)',
                    sublabel: 'Weekly digest, announcements',
                    type: 'toggle',
                    value: emailNotifications,
                    onToggle: setEmailNotifications,
                },
            ],
        },
        {
            title: t('settings.appearance'),
            icon: 'color-palette-outline' as IoniconsName,
            iconColor: '#6366F1',
            items: [
                {
                    icon: 'moon-outline',
                    iconColor: '#6366F1',
                    iconBg: '#EEF2FF',
                    label: t('settings.darkMode'),
                    sublabel: t('settings.darkModeSub'),
                    type: 'toggle',
                    value: darkMode,
                    onToggle: setDarkMode,
                },
                {
                    icon: 'play-circle-outline',
                    iconColor: '#EC4899',
                    iconBg: '#FDF2F8',
                    label: t('settings.autoPlay'),
                    type: 'toggle',
                    value: autoPlay,
                    onToggle: setAutoPlay,
                },
                {
                    icon: 'phone-portrait-outline',
                    iconColor: '#F59E0B',
                    iconBg: '#FFFBEB',
                    label: t('settings.hapticFeedback'),
                    sublabel: t('settings.hapticSub'),
                    type: 'toggle',
                    value: hapticFeedback,
                    onToggle: setHapticFeedback,
                },
            ],
        },
        {
            title: t('settings.learningProfile'),
            icon: 'school-outline' as IoniconsName,
            iconColor: '#8B5CF6',
            items: [
                {
                    icon: 'analytics-outline',
                    iconColor: '#8B5CF6',
                    iconBg: '#F3E8FF',
                    label: t('settings.academicProficiency'),
                    sublabel: t('settings.academicProficiencySub'),
                    type: 'navigate',
                    onPress: () => navigation.navigate('AcademicProfile'),
                },
                {
                    icon: 'calendar-outline',
                    iconColor: '#F59E0B',
                    iconBg: '#FEF3C7',
                    label: t('settings.manageDeadlines'),
                    sublabel: t('settings.manageDeadlinesSub'),
                    type: 'navigate',
                    onPress: () => navigation.navigate('ManageDeadlines'),
                },
            ],
        },
        {
            title: t('settings.support'),
            icon: 'help-buoy-outline' as IoniconsName,
            iconColor: '#10B981',
            items: [
                {
                    icon: 'help-circle-outline',
                    iconColor: '#0EA5E9',
                    iconBg: '#F0F9FF',
                    label: t('settings.helpCenter'),
                    type: 'navigate',
                    onPress: () => {
                        void openExternalLink('https://stunity.com/help');
                    },
                },
                {
                    icon: 'chatbubble-ellipses-outline',
                    iconColor: '#10B981',
                    iconBg: '#ECFDF5',
                    label: t('settings.contactSupport'),
                    sublabel: t('settings.contactSupportSub'),
                    type: 'navigate',
                    onPress: () => openSupportEmail('Stunity support request'),
                },
                {
                    icon: 'star-outline',
                    iconColor: '#F59E0B',
                    iconBg: '#FFFBEB',
                    label: t('settings.rateApp'),
                    type: 'navigate',
                    onPress: () => Alert.alert('Thank You!', 'We appreciate your feedback. ❤️'),
                },
                {
                    icon: 'information-circle-outline',
                    iconColor: '#64748B',
                    iconBg: '#F8FAFC',
                    label: t('settings.about'),
                    sublabel: t('settings.aboutSub'),
                    type: 'navigate',
                    onPress: () => Alert.alert('Stunity Enterprise', 'Version 1.0.0\n\n© 2026 Stunity Inc.\nAll rights reserved.'),
                },
            ],
        },
        {
            title: t('settings.dangerZone'),
            icon: 'warning-outline' as IoniconsName,
            iconColor: '#EF4444',
            items: [
                {
                    icon: 'log-out-outline',
                    iconColor: '#EF4444',
                    iconBg: '#FEF2F2',
                    label: t('common.logout'),
                    type: 'action',
                    danger: true,
                    onPress: handleLogout,
                },
                {
                    icon: 'trash-outline',
                    iconColor: '#DC2626',
                    iconBg: '#FEF2F2',
                    label: t('settings.deleteAccount'),
                    sublabel: t('settings.deleteAccountSub'),
                    type: 'action',
                    danger: true,
                    onPress: handleDeleteAccount,
                },
            ],
        },
    ], [biometrics, profileVisibility, onlineStatus, pushNotifications, emailNotifications, darkMode, autoPlay, hapticFeedback, handleLogout, handleDeleteAccount, navigation, user?.email, t, i18n.language, openExternalLink, openSupportEmail, handleBiometricsToggle, handleProfileVisibilityToggle, handleOnlineStatusToggle]);

    // ── Render ─────────────────────────────────────────────────────

    // ── Flatten Data for FlashList ─────────────────────────────────

    const listData = useMemo(() => {
        const data: any[] = [];
        sections.forEach((section) => {
            // 1) Push the section header
            data.push({
                type: 'header',
                id: `header-${section.title}`,
                title: section.title,
                icon: section.icon,
                iconColor: section.iconColor,
            });

            // 2) Push the items
            section.items.forEach((item, iIdx) => {
                data.push({
                    type: 'item',
                    id: `item-${section.title}-${item.label}`,
                    item,
                    index: iIdx,
                    isFirst: iIdx === 0,
                    isLast: iIdx === section.items.length - 1,
                    isDanger: section.title === 'Danger Zone',
                });
            });
        });
        return data;
    }, [sections]);

    const renderItem = useCallback(({ item }: any) => {
        if (item.type === 'header') {
            return (
                <View style={styles.sectionTitleRow}>
                    <View style={[styles.sectionTitleIcon, { backgroundColor: item.iconColor + '15' }]}>
                        <Ionicons name={item.icon} size={14} color={item.iconColor} />
                    </View>
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                </View>
            );
        }

        if (item.type === 'item') {
            return (
                <View style={[
                    styles.sectionCardFlex,
                    item.isDanger && styles.dangerCard,
                    item.isFirst && styles.sectionCardTop,
                    item.isLast && styles.sectionCardBottom,
                ]}>
                    {!item.isFirst && <View style={styles.divider} />}
                    <SettingRow item={item.item} index={item.index} sectionDelay={0} />
                </View>
            );
        }

        return null;
    }, []);

    const ListHeader = useCallback(() => (
        <>
            {/* ─── Profile Card ─────────────────────────────────── */}
            <Animated.View>
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
                                <Text style={styles.memberSince}>{t('settings.memberSince')} {memberSince}</Text>
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
                            <Text style={styles.profileActionText}>{t('settings.viewProfile')}</Text>
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
                style={styles.quickStatsRow}
            >
                <QuickStat icon="bookmark-outline" label={t('settings.bookmarks')} color="#6366F1" onPress={() => navigation.navigate('Bookmarks')} />
                <QuickStat icon="document-text-outline" label={t('settings.myPosts')} color="#EC4899" onPress={() => navigation.navigate('MyPosts')} />
                <QuickStat icon="people-outline" label={t('settings.connections')} color="#10B981" onPress={() => navigation.navigate('Connections', { type: 'followers' })} />
                <QuickStat icon="trophy-outline" label={t('settings.achievements')} color="#F59E0B" onPress={openAchievements} />
            </Animated.View>
        </>
    ), [user, fullName, memberSince, navigation, handleViewProfile, openAchievements]);

    const ListFooter = useCallback(() => (
        <Animated.View
            style={styles.footer}
        >
            <View style={styles.footerLogoRow}>
                <StunityLogo width={140} height={40} />
            </View>
            <Text style={styles.footerText}>Stunity Enterprise</Text>
            <Text style={styles.footerVersion}>Version 1.0.0 · Build 2026.02</Text>
            <Text style={styles.footerSubtext}>Made with ❤️ for learners everywhere</Text>
        </Animated.View>
    ), []);

    // ── FlashList Render ──────────────────────────────────────────

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Animated Header */}
            <Animated.View>
                <SafeAreaView edges={['top']} style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="chevron-back" size={22} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('common.settings')}</Text>
                    <View style={{ width: 40 }} />
                </SafeAreaView>
            </Animated.View>

            <LanguageSelector 
                visible={languageSelectorVisible} 
                onClose={() => setLanguageSelectorVisible(false)} 
            />

            <FlashList
                data={listData}
                renderItem={renderItem}
                keyExtractor={(item: any) => item.id}
                getItemType={(item: any) => item.type}
                // @ts-ignore Type constraint bypass
                estimatedItemSize={60}
                contentContainerStyle={styles.scrollContent}
                ListHeaderComponent={ListHeader}
                ListFooterComponent={ListFooter}
                showsVerticalScrollIndicator={false}
            />
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
        paddingTop: 16,
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
    sectionCardFlex: {
        backgroundColor: '#fff',
        overflow: 'hidden',
        shadowOpacity: 0.04,
    },
    sectionCardTop: {
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
    },
    sectionCardBottom: {
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
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
