/**
 * About Tab Enhancements
 * 
 * Additional sections for the About tab:
 * - Certifications display
 * - Skills & Interests tags
 * - Profile Completeness Card
 * - Career Goals Card
 * - Project Showcase
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import type { Certification, User, UserStats } from '@/types';

// ── Certification Card ───────────────────────────────────────────

function CertificationCard({ cert }: { cert: Certification }) {
    return (
        <View style={certStyles.card}>
            <View style={certStyles.header}>
                <View style={certStyles.iconWrap}>
                    <Ionicons name="ribbon" size={20} color="#0EA5E9" />
                </View>
                <View style={certStyles.info}>
                    <Text style={certStyles.name} numberOfLines={1}>{cert.name}</Text>
                    <Text style={certStyles.org}>{cert.issuingOrg}</Text>
                </View>
                {cert.isVerified && (
                    <View style={certStyles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={certStyles.verifiedText}>Verified</Text>
                    </View>
                )}
            </View>
            <View style={certStyles.meta}>
                <Text style={certStyles.date}>
                    Issued {new Date(cert.issueDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    {cert.expiryDate ? ` · Expires ${new Date(cert.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
                </Text>
                {cert.credentialUrl && (
                    <TouchableOpacity onPress={() => Linking.openURL(cert.credentialUrl!)} style={certStyles.linkBtn}>
                        <Ionicons name="open-outline" size={12} color="#0EA5E9" />
                        <Text style={certStyles.linkText}>View</Text>
                    </TouchableOpacity>
                )}
            </View>
            {cert.skills.length > 0 && (
                <View style={certStyles.skills}>
                    {cert.skills.slice(0, 4).map((skill, i) => (
                        <View key={i} style={certStyles.skillTag}>
                            <Text style={certStyles.skillText}>{skill}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const certStyles = StyleSheet.create({
    card: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
    org: { fontSize: 12, color: '#6B7280', marginTop: 1 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    verifiedText: { fontSize: 10, fontWeight: '600', color: '#10B981' },
    meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    date: { fontSize: 11, color: '#9CA3AF' },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    linkText: { fontSize: 11, fontWeight: '600', color: '#0EA5E9' },
    skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    skillTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    skillText: { fontSize: 10, fontWeight: '600', color: '#64748B' },
});

// ── Certifications Section ───────────────────────────────────────

export function CertificationsSection({ certifications }: { certifications: Certification[] }) {
    if (certifications.length === 0) return null;

    return (
        <View style={sectionStyles.card}>
            <View style={sectionStyles.header}>
                <Ionicons name="ribbon-outline" size={20} color="#0EA5E9" />
                <Text style={sectionStyles.title}>Certifications</Text>
                <View style={sectionStyles.countBadge}>
                    <Text style={sectionStyles.countText}>{certifications.length}</Text>
                </View>
            </View>
            {certifications.map(cert => (
                <CertificationCard key={cert.id} cert={cert} />
            ))}
        </View>
    );
}

// ── Skills & Interests Tags ──────────────────────────────────────

const SKILL_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#F43F5E', '#6366F1'];
const INTEREST_COLORS = ['#F97316', '#14B8A6', '#A855F7', '#EF4444', '#0EA5E9', '#84CC16', '#F472B6', '#6366F1'];

export function SkillsSection({ skills, interests }: { skills: string[]; interests: string[] }) {
    if (skills.length === 0 && interests.length === 0) return null;

    return (
        <View style={sectionStyles.card}>
            {skills.length > 0 && (
                <>
                    <View style={sectionStyles.header}>
                        <Ionicons name="code-slash-outline" size={20} color="#3B82F6" />
                        <Text style={sectionStyles.title}>Skills</Text>
                    </View>
                    <View style={tagStyles.container}>
                        {skills.map((skill, i) => {
                            const color = SKILL_COLORS[i % SKILL_COLORS.length];
                            return (
                                <View key={i} style={[tagStyles.tag, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                                    <View style={[tagStyles.dot, { backgroundColor: color }]} />
                                    <Text style={[tagStyles.text, { color }]}>{skill}</Text>
                                </View>
                            );
                        })}
                    </View>
                </>
            )}

            {interests.length > 0 && (
                <>
                    <View style={[sectionStyles.header, skills.length > 0 && { marginTop: 16 }]}>
                        <Ionicons name="heart-outline" size={20} color="#F43F5E" />
                        <Text style={sectionStyles.title}>Interests</Text>
                    </View>
                    <View style={tagStyles.container}>
                        {interests.map((interest, i) => {
                            const color = INTEREST_COLORS[i % INTEREST_COLORS.length];
                            return (
                                <View key={i} style={[tagStyles.tag, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                                    <Text style={[tagStyles.text, { color }]}>{interest}</Text>
                                </View>
                            );
                        })}
                    </View>
                </>
            )}
        </View>
    );
}

// ── Profile Completeness Card ────────────────────────────────────

interface CompletenessItem {
    label: string;
    icon: string;
    done: boolean;
    color: string;
}

export function ProfileCompletenessCard({ profile, onEdit }: { profile: User; onEdit?: () => void }) {
    const items: CompletenessItem[] = [
        { label: 'Profile Photo', icon: 'camera', done: !!profile.profilePictureUrl, color: '#0EA5E9' },
        { label: 'Headline', icon: 'briefcase', done: !!(profile.headline || profile.professionalTitle), color: '#A855F7' },
        { label: 'Bio', icon: 'document-text', done: !!profile.bio, color: '#3B82F6' },
        { label: 'Location', icon: 'location', done: !!profile.location, color: '#10B981' },
        { label: 'Skills', icon: 'code-slash', done: (profile.skills?.length ?? 0) > 0, color: '#F59E0B' },
        { label: 'Interests', icon: 'heart', done: (profile.interests?.length ?? 0) > 0, color: '#EC4899' },
    ];

    const completed = items.filter(i => i.done).length;
    const pct = Math.round((completed / items.length) * 100);
    const ringSize = 60;
    const sw = 5;
    const r = (ringSize - sw) / 2;
    const circ = 2 * Math.PI * r;

    if (pct === 100) return null;

    return (
        <View style={cmpStyles.card}>
            <View style={cmpStyles.topRow}>
                <View style={cmpStyles.ringWrap}>
                    <Svg width={ringSize} height={ringSize}>
                        <Circle cx={ringSize / 2} cy={ringSize / 2} r={r}
                            stroke="#F1F5F9" strokeWidth={sw} fill="none" />
                        <Circle cx={ringSize / 2} cy={ringSize / 2} r={r}
                            stroke="#0EA5E9" strokeWidth={sw} fill="none"
                            strokeDasharray={`${circ}`}
                            strokeDashoffset={circ * (1 - pct / 100)}
                            strokeLinecap="round"
                            transform={`rotate(-90, ${ringSize / 2}, ${ringSize / 2})`} />
                    </Svg>
                    <Text style={cmpStyles.ringPct}>{pct}%</Text>
                </View>
                <View style={cmpStyles.topInfo}>
                    <Text style={cmpStyles.topTitle}>Profile Strength</Text>
                    <Text style={cmpStyles.topSub}>{completed}/{items.length} sections completed</Text>
                    {onEdit && (
                        <TouchableOpacity style={cmpStyles.editBtn} onPress={onEdit}>
                            <Ionicons name="create-outline" size={14} color="#0EA5E9" />
                            <Text style={cmpStyles.editText}>Complete Profile</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <View style={cmpStyles.checklist}>
                {items.map((item, i) => (
                    <View key={i} style={cmpStyles.checkRow}>
                        <View style={[cmpStyles.checkIcon, { backgroundColor: item.done ? item.color + '15' : '#F4F6F9' }]}>
                            <Ionicons
                                name={item.done ? 'checkmark' : (item.icon as any)}
                                size={14}
                                color={item.done ? item.color : '#9CA3AF'}
                            />
                        </View>
                        <Text style={[cmpStyles.checkLabel, item.done && { color: '#6B7280', textDecorationLine: 'line-through' }]}>
                            {item.label}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const cmpStyles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 20, shadowColor: '#000',  shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    ringWrap: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
    ringPct: { position: 'absolute', fontSize: 14, fontWeight: '800', color: '#0EA5E9' },
    topInfo: { flex: 1 },
    topTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
    topSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
    editText: { fontSize: 12, fontWeight: '600', color: '#0EA5E9' },
    checklist: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '47%' },
    checkIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    checkLabel: { fontSize: 12, fontWeight: '500', color: '#1F2937' },
});

// ── Career Goals Card ────────────────────────────────────────────

export function CareerGoalsCard({ careerGoals, isOwnProfile, onEdit }: { careerGoals?: string; isOwnProfile: boolean; onEdit?: () => void }) {
    if (!careerGoals && !isOwnProfile) return null;

    return (
        <View style={goalStyles.card}>
            <LinearGradient
                colors={['#7DD3FC', '#0EA5E9', '#0284C7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={goalStyles.headerGradient}
            >
                <View style={goalStyles.headerIcon}>
                    <Ionicons name="rocket" size={18} color="#0284C7" />
                </View>
                <Text style={goalStyles.headerTitle}>Career Goals</Text>
                {isOwnProfile && onEdit && (
                    <TouchableOpacity onPress={onEdit} style={goalStyles.headerEdit}>
                        <Ionicons name="create-outline" size={16} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                )}
            </LinearGradient>
            <View style={goalStyles.body}>
                {careerGoals ? (
                    <Text style={goalStyles.text}>{careerGoals}</Text>
                ) : (
                    <View style={goalStyles.empty}>
                        <Ionicons name="add-circle-outline" size={24} color="#D1D5DB" />
                        <Text style={goalStyles.emptyText}>Add your career goals</Text>
                        <Text style={goalStyles.emptyHint}>Share what you're working toward</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const goalStyles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000',  shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    headerGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    headerIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
    headerEdit: { width: 32, height: 32, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    body: { padding: 16 },
    text: { fontSize: 14, color: '#374151', lineHeight: 22 },
    empty: { alignItems: 'center', paddingVertical: 12, gap: 4 },
    emptyText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
    emptyHint: { fontSize: 12, color: '#D1D5DB' },
});

// ── Project Showcase ─────────────────────────────────────────────

interface ProjectItem {
    id: string;
    name: string;
    description?: string;
    technologies?: string[];
}

export function ProjectShowcase({ stats, isOwnProfile }: { stats: UserStats | null; isOwnProfile: boolean }) {
    const projectCount = stats?.projects ?? 0;
    if (projectCount === 0 && !isOwnProfile) return null;

    const mockProjects: ProjectItem[] = projectCount > 0
        ? Array.from({ length: Math.min(projectCount, 5) }, (_, i) => ({
            id: `p-${i}`,
            name: `Project ${i + 1}`,
            description: 'A project in your portfolio',
            technologies: ['React', 'Node.js'],
        }))
        : [];

    return (
        <View style={projStyles.card}>
            <View style={sectionStyles.header}>
                <Ionicons name="folder-open-outline" size={20} color="#8B5CF6" />
                <Text style={sectionStyles.title}>Projects</Text>
                {projectCount > 0 && (
                    <View style={sectionStyles.countBadge}>
                        <Text style={sectionStyles.countText}>{projectCount}</Text>
                    </View>
                )}
            </View>

            {mockProjects.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={projStyles.scroll}>
                    {mockProjects.map((proj) => (
                        <View key={proj.id} style={projStyles.projCard}>
                            <LinearGradient
                                colors={['#F3E8FF', '#FAF5FF']}
                                style={projStyles.projGradient}
                            >
                                <View style={projStyles.projIcon}>
                                    <Ionicons name="code-slash" size={18} color="#8B5CF6" />
                                </View>
                                <Text style={projStyles.projName} numberOfLines={1}>{proj.name}</Text>
                                {proj.description && (
                                    <Text style={projStyles.projDesc} numberOfLines={2}>{proj.description}</Text>
                                )}
                                {proj.technologies && proj.technologies.length > 0 && (
                                    <View style={projStyles.techRow}>
                                        {proj.technologies.slice(0, 3).map((tech, i) => (
                                            <View key={i} style={projStyles.techTag}>
                                                <Text style={projStyles.techText}>{tech}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </LinearGradient>
                        </View>
                    ))}
                </ScrollView>
            ) : (
                <View style={projStyles.empty}>
                    <Ionicons name="add-circle-outline" size={24} color="#D1D5DB" />
                    <Text style={projStyles.emptyText}>No projects yet</Text>
                    <Text style={projStyles.emptyHint}>Add projects to showcase your work</Text>
                </View>
            )}
        </View>
    );
}

const projStyles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 20, shadowColor: '#000',  shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    scroll: { marginTop: 4, marginHorizontal: -4 },
    projCard: { width: 160, marginHorizontal: 4, borderRadius: 14, overflow: 'hidden' },
    projGradient: { padding: 14, borderRadius: 14, minHeight: 130 },
    projIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    projName: { fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
    projDesc: { fontSize: 11, color: '#6B7280', lineHeight: 16, marginBottom: 8 },
    techRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    techTag: { backgroundColor: 'rgba(139,92,246,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    techText: { fontSize: 9, fontWeight: '600', color: '#7C3AED' },
    empty: { alignItems: 'center', paddingVertical: 16, gap: 4 },
    emptyText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
    emptyHint: { fontSize: 12, color: '#D1D5DB' },
});

// ── Shared Styles ────────────────────────────────────────────────

const sectionStyles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 20, shadowColor: '#000',  shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    title: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1 },
    countBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    countText: { fontSize: 12, fontWeight: '700', color: '#0EA5E9' },
});

const tagStyles = StyleSheet.create({
    container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    text: { fontSize: 13, fontWeight: '600' },
});
