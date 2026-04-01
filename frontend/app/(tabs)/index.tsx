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
import { useTheme, getShadows } from '../../src/utils/theme';
import { Card } from '../../src/components/Card';
import { ProgressRing } from '../../src/components/ProgressRing';
import { QuickActionButton } from '../../src/components/QuickActionButton';
import { api, getToday } from '../../src/utils/api';
import { DashboardSummary } from '../../src/types';

const MOOD_EMOJIS = ['😢', '😞', '😐', '🙂', '😊', '😄', '😁', '🤩', '🥳', '😍'];

export default function HomeScreen() {
  const { theme, toggleTheme, themeMode } = useTheme();
  const shadows = getShadows(theme);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [localMode, setLocalMode] = useState(api.isLocalData());
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

  const toggleSampleMode = async () => {
    const nextMode = !localMode;
    setLocalMode(nextMode);
    api.setLocalData(nextMode);
    setSeeding(true);

    try {
      if (nextMode) {
        await api.post('/seed');
        await fetchDashboard();
        Alert.alert('Sample Data Mode', 'Local sample data enabled.');
      } else {
        await fetchDashboard();
        Alert.alert('Live Mode', 'Backend/live data mode enabled.');
      }
    } catch (error: any) {
      console.error('Error toggling sample mode:', error);
      Alert.alert('Error', `Network/API issue: ${error?.message || 'unknown'}`);
    } finally {
      setSeeding(false);
    }
  };

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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.text }]}>{getGreeting()} ✨</Text>
            <Text style={[styles.date, { color: theme.textSecondary }]}>{formatDisplayDate()}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.themeButton} onPress={toggleTheme}>
              <Ionicons 
                name={themeMode === 'dark' ? 'sunny' : 'moon'} 
                size={24} 
                color={theme.primary} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton}>
              <Ionicons name="person-circle-outline" size={40} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          {/* Habits Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="checkbox" size={20} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Habits</Text>
            </View>
            <ProgressRing
              progress={summary?.habits.percentage || 0}
              size={70}
              strokeWidth={6}
              color={theme.primary}
            >
              <Text style={[styles.progressText, { color: theme.text }]}>
                {summary?.habits.percentage || 0}%
              </Text>
            </ProgressRing>
            <Text style={[styles.cardSubtext, { color: theme.textSecondary }]}>
              {summary?.habits.completed || 0}/{summary?.habits.total || 0} done
            </Text>
          </Card>

          {/* Water Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="water" size={20} color={theme.secondary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Water</Text>
            </View>
            <ProgressRing
              progress={summary?.water.percentage || 0}
              size={70}
              strokeWidth={6}
              color={theme.secondary}
            >
              <Ionicons name="water" size={24} color={theme.secondary} />
            </ProgressRing>
            <Text style={[styles.cardSubtext, { color: theme.textSecondary }]}>
              {summary?.water.cups || 0}/{summary?.water.goal || 8} cups
            </Text>
          </Card>

          {/* Calories Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="flame" size={20} color={theme.warning} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Calories</Text>
            </View>
            <Text style={[styles.calorieNumber, { color: theme.warning }]}>
              {summary?.nutrition.calories || 0}
            </Text>
            <Text style={[styles.cardSubtext, { color: theme.textSecondary }]}>
              {summary?.nutrition.meals || 0} meals logged
            </Text>
          </Card>

          {/* Mood Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="happy" size={20} color={theme.health} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Mood</Text>
            </View>
            <Text style={styles.moodEmoji}>
              {summary?.mood?.emoji || '😊'}
            </Text>
            <Text style={[styles.cardSubtext, { color: theme.textSecondary }]}>
              {summary?.mood ? `Level ${summary.mood.mood_level}/10` : 'Not logged'}
            </Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickActionButton
              icon="checkbox-outline"
              label="Log Habit"
              onPress={() => router.push('/(tabs)/habits')}
              color={theme.primary}
            />
            <QuickActionButton
              icon="water-outline"
              label="Add Water"
              onPress={() => setShowWaterModal(true)}
              color={theme.secondary}
            />
            <QuickActionButton
              icon="restaurant-outline"
              label="Log Meal"
              onPress={() => setShowMealModal(true)}
              color={theme.warning}
            />
            <QuickActionButton
              icon="happy-outline"
              label="Log Mood"
              onPress={() => setShowMoodModal(true)}
              color={theme.health}
            />
          </View>
        </View>

        {/* Today's Workout */}
        <Card style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <View style={styles.todayTitleRow}>
              <Ionicons name="fitness" size={24} color={theme.primary} />
              <Text style={[styles.todayTitle, { color: theme.text }]}>Today's Fitness</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/fitness')}>
              <Text style={[styles.seeAllText, { color: theme.primary }]}>Add +</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.todayContent, { color: theme.textSecondary }]}>
            {summary?.fitness.workouts_today === 0
              ? 'No workouts logged today. Time to get moving! 💪'
              : `${summary?.fitness.workouts_today} workout(s) completed!`}
          </Text>
        </Card>

        {/* Sample Data Mode Toggle */}
        <TouchableOpacity 
          style={[
            styles.seedButton,
            { backgroundColor: theme.cardElevated, borderColor: theme.border, opacity: seeding ? 0.6 : 1 },
          ]}
          onPress={toggleSampleMode}
          disabled={seeding}
        >
          <Ionicons name="sparkles" size={18} color={theme.primary} />
          <Text style={[styles.seedButtonText, { color: theme.textSecondary }]}> 
            {seeding ? (localMode ? 'Switching to Live Data...' : 'Switching to Sample Data...') : (localMode ? 'Switch to Live Data' : 'Load Sample Data')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Water Modal */}
      <Modal visible={showWaterModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <Card style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Water 💧</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Current: {summary?.water.cups || 0} / {summary?.water.goal || 8} cups
            </Text>
            <View style={styles.waterButtons}>
              <TouchableOpacity
                style={[styles.waterButton, { backgroundColor: theme.secondaryBg }]}
                onPress={async () => {
                  await addWater();
                  setShowWaterModal(false);
                }}
              >
                <Ionicons name="water" size={32} color={theme.secondary} />
                <Text style={[styles.waterButtonText, { color: theme.secondary }]}>+1 Cup</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowWaterModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: theme.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </Card>
        </View>
      </Modal>

      {/* Mood Modal */}
      <Modal visible={showMoodModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <Card style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>How are you feeling? ✨</Text>
            <View style={styles.moodGrid}>
              {MOOD_EMOJIS.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.moodOption,
                    { backgroundColor: theme.background },
                    selectedMood === index + 1 && { 
                      backgroundColor: theme.primaryBg,
                      borderWidth: 2,
                      borderColor: theme.primary,
                    },
                  ]}
                  onPress={() => setSelectedMood(index + 1)}
                >
                  <Text style={styles.moodOptionEmoji}>{emoji}</Text>
                  <Text style={[styles.moodOptionLevel, { color: theme.textSecondary }]}>{index + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { 
                borderColor: theme.border, 
                backgroundColor: theme.background,
                color: theme.text,
              }]}
              placeholder="Add a note (optional)"
              placeholderTextColor={theme.textLight}
              value={moodNote}
              onChangeText={setMoodNote}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { 
                  backgroundColor: theme.background, 
                  borderColor: theme.border 
                }]}
                onPress={() => setShowMoodModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.primary }]}
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
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <Card style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Log Meal 🍽️</Text>
            <TextInput
              style={[styles.input, { 
                borderColor: theme.border, 
                backgroundColor: theme.background,
                color: theme.text,
              }]}
              placeholder="Meal name"
              placeholderTextColor={theme.textLight}
              value={mealName}
              onChangeText={setMealName}
            />
            <TextInput
              style={[styles.input, { 
                borderColor: theme.border, 
                backgroundColor: theme.background,
                color: theme.text,
              }]}
              placeholder="Calories"
              placeholderTextColor={theme.textLight}
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
                    { backgroundColor: theme.background, borderColor: theme.border },
                    mealType === type && { backgroundColor: theme.primary, borderColor: theme.primary },
                  ]}
                  onPress={() => setMealType(type)}
                >
                  <Text
                    style={[
                      styles.mealTypeText,
                      { color: theme.textSecondary },
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
                style={[styles.modalButton, styles.cancelButton, { 
                  backgroundColor: theme.background, 
                  borderColor: theme.border 
                }]}
                onPress={() => setShowMealModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.primary }]}
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
  },
  date: {
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeButton: {
    padding: 8,
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
  },
  progressText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtext: {
    fontSize: 12,
    marginTop: 8,
  },
  calorieNumber: {
    fontSize: 32,
    fontWeight: '700',
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
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  todayContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  seedButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
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
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
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
    borderRadius: 16,
    width: 120,
  },
  waterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  closeButton: {
    alignItems: 'center',
    padding: 12,
  },
  closeButtonText: {
    fontSize: 16,
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
  },
  moodOptionEmoji: {
    fontSize: 24,
  },
  moodOptionLevel: {
    fontSize: 10,
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
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
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  saveButton: {},
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
    borderWidth: 1,
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mealTypeTextSelected: {
    color: '#fff',
  },
});
