/**
 * PerformanceBreakdown
 * 
 * Detailed performance statistics with visual charts
 * Shows accuracy, time spent, and improvements
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface PerformanceBreakdownProps {
  correctCount: number;
  totalQuestions: number;
  timeSpent?: number;
  timeLimit?: number;
  accuracy: number;
}

export const PerformanceBreakdown: React.FC<PerformanceBreakdownProps> = ({
  correctCount,
  totalQuestions,
  timeSpent,
  timeLimit,
  accuracy,
}) => {
  const avgTimePerQuestion = timeSpent && totalQuestions > 0
    ? Math.round(timeSpent / totalQuestions)
    : 0;

  const timeEfficiency = timeSpent && timeLimit
    ? Math.round(((timeLimit - timeSpent) / timeLimit) * 100)
    : 0;

  const getAccuracyColor = (acc: number) => {
    if (acc >= 90) return ['#10b981', '#059669'];
    if (acc >= 70) return ['#f59e0b', '#d97706'];
    return ['#ef4444', '#dc2626'];
  };

  const getAccuracyLabel = (acc: number) => {
    if (acc >= 90) return 'Excellent!';
    if (acc >= 70) return 'Good Job!';
    if (acc >= 50) return 'Keep Trying!';
    return 'Practice More';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Performance Breakdown</Text>

      {/* Accuracy Card */}
      <LinearGradient
        colors={getAccuracyColor(accuracy)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.cardTitle}>Accuracy</Text>
        </View>
        <Text style={styles.cardValue}>{accuracy}%</Text>
        <Text style={styles.cardSubtitle}>{getAccuracyLabel(accuracy)}</Text>
        <View style={styles.cardStats}>
          <Text style={styles.cardStat}>{correctCount} correct</Text>
          <Text style={styles.cardStat}>•</Text>
          <Text style={styles.cardStat}>{totalQuestions - correctCount} wrong</Text>
        </View>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.grid}>
        {/* Time Spent */}
        {timeSpent !== undefined && (
          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color="#667eea" />
            <Text style={styles.statValue}>
              {Math.floor(timeSpent / 60)}:{String(timeSpent % 60).padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>Time Spent</Text>
          </View>
        )}

        {/* Avg Time Per Question */}
        {avgTimePerQuestion > 0 && (
          <View style={styles.statCard}>
            <Ionicons name="timer" size={32} color="#8b5cf6" />
            <Text style={styles.statValue}>{avgTimePerQuestion}s</Text>
            <Text style={styles.statLabel}>Avg / Question</Text>
          </View>
        )}

        {/* Questions Answered */}
        <View style={styles.statCard}>
          <Ionicons name="list" size={32} color="#10b981" />
          <Text style={styles.statValue}>{totalQuestions}</Text>
          <Text style={styles.statLabel}>Questions</Text>
        </View>

        {/* Efficiency */}
        {timeEfficiency > 0 && (
          <View style={styles.statCard}>
            <Ionicons name="speedometer" size={32} color="#f59e0b" />
            <Text style={styles.statValue}>{timeEfficiency}%</Text>
            <Text style={styles.statLabel}>Efficiency</Text>
          </View>
        )}
      </View>

      {/* Performance Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>💡 Tips to Improve</Text>
        {accuracy < 70 && (
          <View style={styles.tip}>
            <Ionicons name="bulb" size={16} color="#f59e0b" />
            <Text style={styles.tipText}>Review the material before taking the quiz</Text>
          </View>
        )}
        {timeEfficiency < 30 && (
          <View style={styles.tip}>
            <Ionicons name="bulb" size={16} color="#f59e0b" />
            <Text style={styles.tipText}>Try to answer questions more quickly</Text>
          </View>
        )}
        {accuracy >= 90 && (
          <View style={styles.tip}>
            <Ionicons name="trophy" size={16} color="#10b981" />
            <Text style={styles.tipText}>Great job! Challenge friends to beat your score!</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  card: {
    padding: 20,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    
    
    shadowRadius: 4,
    
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cardValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 8,
  },
  cardStat: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    
    
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    
    shadowOpacity: 0.05,
    shadowRadius: 2,
    
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  tipsContainer: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    
    borderColor: '#fbbf24',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 12,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
});
