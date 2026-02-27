/**
 * AIPromptModal
 * 
 * A universal bottom sheet modal for capturing the user's AI generation prompt.
 * Collects topic, grade level, and difficulty/length.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export interface AIPromptData {
    topic: string;
    gradeLevel: string;
    count: number;
    difficulty: string;
}

interface AIPromptModalProps {
    visible: boolean;
    onClose: () => void;
    onGenerate: (data: AIPromptData) => Promise<void>;
    type?: 'quiz' | 'lesson' | 'poll' | 'course';
    title?: string;
}

const GRADE_LEVELS = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'University'];
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

export function AIPromptModal({
    visible,
    onClose,
    onGenerate,
    type = 'quiz',
    title = 'Generate with AI',
}: AIPromptModalProps) {
    const [topic, setTopic] = useState('');
    const [gradeLevel, setGradeLevel] = useState('Grade 8');
    const [difficulty, setDifficulty] = useState('MEDIUM');
    const [count, setCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);

    // Reset state when opened
    useEffect(() => {
        if (visible) {
            setIsGenerating(false);
            setTopic(''); // Start fresh or keep previous topic? Usually start fresh is safer
        }
    }, [visible]);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setIsGenerating(true);
        try {
            await onGenerate({ topic: topic.trim(), gradeLevel, count, difficulty });
            onClose();
        } catch (error) {
            console.error(error);
            setIsGenerating(false);
        }
    };

    const isCountRelevant = type === 'quiz' || type === 'poll' || type === 'course';
    const isDifficultyRelevant = type === 'quiz';
    const countLabel = type === 'quiz' ? 'Questions' : type === 'poll' ? 'Options' : type === 'course' ? 'Weeks' : 'Items';
    const countMax = type === 'quiz' ? 20 : type === 'poll' ? 6 : type === 'course' ? 12 : 10;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.overlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.container}
                    >
                        <View style={styles.sheet}>
                            {/* Header */}
                            <View style={styles.header}>
                                <View style={styles.headerTitleWrap}>
                                    <Ionicons name="sparkles" size={20} color="#8B5CF6" style={{ marginRight: 8 }} /><Text style={styles.title}>{title}</Text>
                                </View>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isGenerating}>
                                    <Ionicons name="close" size={24} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>

                            {/* Input Area */}
                            <View style={styles.content}>
                                <Text style={styles.label}>What should this be about?</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={
                                        type === 'quiz' ? "e.g., The Water Cycle, Photosynthesis..." :
                                            type === 'poll' ? "e.g., Best study methods for finals..." :
                                                "Topic"
                                    }
                                    value={topic}
                                    onChangeText={setTopic}
                                    multiline
                                    numberOfLines={2}
                                    maxLength={150}
                                    autoFocus
                                    editable={!isGenerating}
                                />

                                <Text style={styles.label}>Audience Level</Text>
                                <View style={styles.chipsContainer}>
                                    {GRADE_LEVELS.slice(0, 5).map(grade => (
                                        <TouchableOpacity
                                            key={grade}
                                            style={[styles.chip, gradeLevel === grade && styles.chipActive]}
                                            onPress={() => { Haptics.selectionAsync(); setGradeLevel(grade); }}
                                            disabled={isGenerating}
                                        >
                                            <Text style={[styles.chipText, gradeLevel === grade && styles.chipTextActive]}>{grade}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {isDifficultyRelevant ? (
                                    <>
                                        <Text style={styles.label}>Difficulty</Text>
                                        <View style={styles.chipsContainer}>
                                            {DIFFICULTIES.map(diff => (
                                                <TouchableOpacity
                                                    key={diff}
                                                    style={[styles.chip, difficulty === diff && styles.chipActive]}
                                                    onPress={() => { Haptics.selectionAsync(); setDifficulty(diff); }}
                                                    disabled={isGenerating}
                                                >
                                                    <Text style={[styles.chipText, difficulty === diff && styles.chipTextActive]}>
                                                        {diff.charAt(0) + diff.slice(1).toLowerCase()}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </>
                                ) : null}

                                {isCountRelevant && (
                                    <View style={styles.counterRow}>
                                        <Text style={styles.label}>Number of {countLabel}</Text>
                                        <View style={styles.counter}>
                                            <TouchableOpacity
                                                style={styles.counterBtn}
                                                onPress={() => { Haptics.selectionAsync(); setCount(Math.max(1, count - 1)); }}
                                                disabled={isGenerating || count <= 1}
                                            >
                                                <Ionicons name="remove" size={20} color={count <= 1 ? '#D1D5DB' : '#4B5563'} />
                                            </TouchableOpacity>
                                            <Text style={styles.counterText}>{count}</Text>
                                            <TouchableOpacity
                                                style={styles.counterBtn}
                                                onPress={() => { Haptics.selectionAsync(); setCount(Math.min(countMax, count + 1)); }}
                                                disabled={isGenerating || count >= countMax}
                                            >
                                                <Ionicons name="add" size={20} color={count >= countMax ? '#D1D5DB' : '#4B5563'} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Footer */}
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={[styles.generateBtn, (!topic.trim() || isGenerating) && styles.generateBtnDisabled]}
                                    onPress={handleGenerate}
                                    disabled={!topic.trim() || isGenerating}
                                >
                                    <LinearGradient
                                        colors={topic.trim() && !isGenerating ? ['#8B5CF6', '#3B82F6'] : ['#D1D5DB', '#9CA3AF']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                    {isGenerating ? (
                                        <View style={styles.generatingState}>
                                            <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                                            <Text style={styles.generateBtnText}>AI is thinking...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.generatingState}>
                                            <Ionicons name="sparkles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                            <Text style={styles.generateBtnText}>Generate</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        width: '100%',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#111827',
        minHeight: 80,
        textAlignVertical: 'top',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    chipActive: {
        backgroundColor: '#F5F3FF', // Light purple
        borderColor: '#C4B5FD',     // Medium purple border
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4B5563',
    },
    chipTextActive: {
        color: '#7C3AED',
        fontWeight: '600',
    },
    counterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    counter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 4,
    },
    counterBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    counterText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        width: 40,
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    generateBtn: {
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    generateBtnDisabled: {
        opacity: 0.9,
    },
    generatingState: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    generateBtnText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
});
