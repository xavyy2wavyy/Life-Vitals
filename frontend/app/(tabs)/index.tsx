import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Shadows } from '../../src/utils/colors';
import { Card } from '../../src/components/Card';
import { ProgressRing } from '../../src/components/ProgressRing';
import { QuickActionButton } from '../../src/components/QuickActionButton';
import { api, getToday } from '../../src/utils/api';
import { DashboardSummary } from '../../src/types';

const MOOD_EMOJIS = ['😢', '😞', '😐', '🙂', '😊', '😄', '😁', '🤩', '🥳', '😍'];

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const today = getToday();
  
  // Modals
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  
  // Modal states
  const [selectedMood, setSelectedMood] = useState(5);
  const [moodNote, setMoodNote] = useState('');
  const [mealName, setMealName] = useState('');
  const [mealCalories, setMealCalories] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');

  const fetchDashboard = useCallback(async () => {
    try {
      const data = await api.get(`/dashboard/${today}`);
      setSummary(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const addWater = async () => {
    try {
      await api.post(`/water/${today}/add?cups=1`);
      await fetchDashboard();
    } catch (error) {
      console.error('Error adding water:', error);
    }
  };

  const saveMood = async () => {
    try {
      await api.post('/mood', {
        date: today,
        mood_level: selectedMood,
        emoji: MOOD_EMOJIS[selectedMood - 1],
        notes: moodNote || null,
      });
      setShowMoodModal(false);
      setMoodNote('');
      await fetchDashboard();
    } catch (error) {
      console.error('Error saving mood:', error);
    }
  };

  const saveMeal = async () => {
    if (!mealName || !mealCalories) {
      Alert.alert('Error', 'Please enter meal name and calories');
      return;
    }
    try {
      await api.post('/nutrition', {
        date: today,
        name: mealName,
        calories: parseInt(mealCalories),
        meal_type: mealType,
      });
      setShowMealModal(false);
      setMealName('');
      setMealCalories('');
      await fetchDashboard();
    } catch (error) {
      console.error('Error saving meal:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDisplayDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} ✨</Text>
            <Text style={styles.date}>{formatDisplayDate()}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle-outline" size={40} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          {/* Habits Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkbox" size={20} color={Colors.primary} />
              <Text style={styles.cardTitle}>Habits</Text>
            </View>
            <ProgressRing
              progress={summary?.habits.percentage || 0}
              size={70}
              strokeWidth={6}
              color={Colors.primary}
            >
              <Text style={styles.progressText}>
                {summary?.habits.percentage || 0}%
              </Text>
            </ProgressRing>
            <Text style={styles.cardSubtext}>
              {summary?.habits.completed || 0}/{summary?.habits.total || 0} done
            </Text>
          </Card>

          {/* Water Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="water" size={20} color={Colors.secondary} />
              <Text style={styles.cardTitle}>Water</Text>
            </View>
            <ProgressRing
              progress={summary?.water.percentage || 0}
              size={70}
              strokeWidth={6}
              color={Colors.secondary}
            >
              <Ionicons name="water" size={24} color={Colors.secondary} />
            </ProgressRing>
            <Text style={styles.cardSubtext}>
              {summary?.water.cups || 0}/{summary?.water.goal || 8} cups
            </Text>
          </Card>

          {/* Calories Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="flame" size={20} color={Colors.warning} />
              <Text style={styles.cardTitle}>Calories</Text>
            </View>
            <Text style={styles.calorieNumber}>{summary?.nutrition.calories || 0}</Text>
            <Text style={styles.cardSubtext}>
              {summary?.nutrition.meals || 0} meals logged
            </Text>
          </Card>

          {/* Mood Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="happy" size={20} color={Colors.health} />
              <Text style={styles.cardTitle}>Mood</Text>
            </View>
            <Text style={styles.moodEmoji}>
              {summary?.mood?.emoji || '😊'}
            </Text>
            <Text style={styles.cardSubtext}>
              {summary?.mood ? `Level ${summary.mood.mood_level}/10` : 'Not logged'}
            </Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              icon="checkbox-outline"
              label="Log Habit"
              onPress={() => router.push('/(tabs)/habits')}
              color={Colors.primary}
            />
            <QuickActionButton
              icon="water-outline"
              label="Add Water"
              onPress={() => setShowWaterModal(true)}
              color={Colors.secondary}
            />
            <QuickActionButton
              icon="restaurant-outline"
              label="Log Meal"
              onPress={() => setShowMealModal(true)}
              color={Colors.warning}
            />
            <QuickActionButton
              icon="happy-outline"
              label="Log Mood"
              onPress={() => setShowMoodModal(true)}
              color={Colors.health}
            />
          </View>
        </View>

        {/* Today's Workout */}
        <Card style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <View style={styles.todayTitleRow}>
              <Ionicons name="fitness" size={24} color={Colors.primary} />
              <Text style={styles.todayTitle}>Today's Fitness</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/fitness')}>
              <Text style={styles.seeAllText}>Add +</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.todayContent}>
            {summary?.fitness.workouts_today === 0
              ? 'No workouts logged today. Time to get moving! 💪'
              : `${summary?.fitness.workouts_today} workout(s) completed!`}
          </Text>
        </Card>
      </ScrollView>

      {/* Water Modal */}
      <Modal visible={showWaterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Water 💧</Text>
            <Text style={styles.modalSubtitle}>
              Current: {summary?.water.cups || 0} / {summary?.water.goal || 8} cups
            </Text>
            <View style={styles.waterButtons}>
              <TouchableOpacity
                style={styles.waterButton}
                onPress={async () => {
                  await addWater();
                  setShowWaterModal(false);
                }}
              >
                <Ionicons name="water" size={32} color={Colors.secondary} />
                <Text style={styles.waterButtonText}>+1 Cup</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowWaterModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>

      {/* Mood Modal */}
      <Modal visible={showMoodModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>How are you feeling? ✨</Text>
            <View style={styles.moodGrid}>
              {MOOD_EMOJIS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.moodOption,
                    selectedMood === index + 1 && styles.moodOptionSelected,
                  ]}
                  onPress={() => setSelectedMood(index + 1)}
                >
                  <Text style={styles.moodOptionEmoji}>{emoji}</Text>
                  <Text style={styles.moodOptionLevel}>{index + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Add a note (optional)"
              value={moodNote}
              onChangeText={setMoodNote}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMoodModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveMood}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Meal Modal */}
      <Modal visible={showMealModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Meal 🍽️</Text>
            <TextInput
              style={styles.input}
              placeholder="Meal name"
              value={mealName}
              onChangeText={setMealName}
            />
            <TextInput
              style={styles.input}
              placeholder="Calories"
              value={mealCalories}
              onChangeText={setMealCalories}
              keyboardType="numeric"
            />
            <View style={styles.mealTypeRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.mealTypeButton,
                    mealType === type && styles.mealTypeSelected,
                  ]}
                  onPress={() => setMealType(type)}
                >
                  <Text
                    style={[
                      styles.mealTypeText,
                      mealType === type && styles.mealTypeTextSelected,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowMealModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveMeal}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  date: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  profileButton: {
    padding: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cardSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  calorieNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.warning,
  },
  moodEmoji: {
    fontSize: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  todayCard: {
    marginBottom: 16,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  todayContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  waterButtons: {
    alignItems: 'center',
    marginBottom: 20,
  },
  waterButton: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.secondaryBg,
    borderRadius: 16,
    width: 120,
  },
  waterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.secondary,
    marginTop: 8,
  },
  closeButton: {
    alignItems: 'center',
    padding: 12,
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  moodOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    width: 56,
    backgroundColor: Colors.background,
  },
  moodOptionSelected: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  moodOptionEmoji: {
    fontSize: 24,
  },
  moodOptionLevel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  mealTypeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealTypeSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mealTypeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  mealTypeTextSelected: {
    color: '#fff',
  },
});
