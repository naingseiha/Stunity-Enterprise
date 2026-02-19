/**
 * About Tab Enhancements
 * 
 * Additional sections for the About tab:
 * - Certifications display
 * - Skills & Interests tags
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Certification } from '@/types';

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

const sectionStyles = StyleSheet.create({
    card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    title: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1 },
    countBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    countText: { fontSize: 12, fontWeight: '700', color: '#0EA5E9' },
});

const tagStyles = StyleSheet.create({
    container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    text: { fontSize: 13, fontWeight: '600' },
});
