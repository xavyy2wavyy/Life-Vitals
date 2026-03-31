import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '../../src/utils/colors';
import { Card } from '../../src/components/Card';
import { api, getToday } from '../../src/utils/api';
import { Habit, HabitLog } from '../../src/types';

const CATEGORIES = [
  { key: 'health', label: 'Health', color: Colors.health, icon: 'heart' },
  { key: 'personal', label: 'Personal', color: Colors.personal, icon: 'person' },
  { key: 'productivity', label: 'Productivity', color: Colors.productivity, icon: 'rocket' },
] as const;

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('personal');
  const today = getToday();

  const fetchData = useCallback(async () => {
    try {
      const [habitsData, logsData] = await Promise.all([
        api.get('/habits'),
        api.get(`/habits/logs/${today}`),
      ]);
      setHabits(habitsData);
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching habits:', error);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const toggleHabit = async (habitId: string) => {
    const currentLog = logs.find((l) => l.habit_id === habitId);
    const newCompleted = !(currentLog?.completed);
    
    try {
      await api.post(`/habits/log?habit_id=${habitId}&date=${today}&completed=${newCompleted}`);
      await fetchData();
    } catch (error) {
      console.error('Error toggling habit:', error);
    }
  };

  const createHabit = async () => {
    if (!newHabitName.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }
    try {
      await api.post('/habits', {
        name: newHabitName,
        category: selectedCategory,
        icon: 'star',
      });
      setShowModal(false);
      setNewHabitName('');
      await fetchData();
    } catch (error) {
      console.error('Error creating habit:', error);
    }
  };

  const deleteHabit = async (habitId: string) => {
    Alert.alert('Delete Habit', 'Are you sure you want to delete this habit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/habits/${habitId}`);
            await fetchData();
          } catch (error) {
            console.error('Error deleting habit:', error);
          }
        },
      },
    ]);
  };

  const isHabitCompleted = (habitId: string) => {
    return logs.find((l) => l.habit_id === habitId)?.completed || false;
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find((c) => c.key === category) || CATEGORIES[1];
  };

  const completedCount = habits.filter((h) => isHabitCompleted(h.id)).length;

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
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Habits</Text>
          <Text style={styles.subtitle}>
            {completedCount}/{habits.length} completed today
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {habits.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="checkbox-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No habits yet</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first habit</Text>
          </Card>
        ) : (
          habits.map((habit) => {
            const categoryInfo = getCategoryInfo(habit.category);
            const completed = isHabitCompleted(habit.id);
            return (
              <TouchableOpacity
                key={habit.id}
                onLongPress={() => deleteHabit(habit.id)}
                activeOpacity={0.8}
              >
                <Card style={[styles.habitCard, completed && styles.habitCardCompleted]}>
                  <TouchableOpacity
                    style={[
                      styles.checkbox,
                      { borderColor: categoryInfo.color },
                      completed && { backgroundColor: categoryInfo.color },
                    ]}
                    onPress={() => toggleHabit(habit.id)}
                  >
                    {completed && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                  <View style={styles.habitInfo}>
                    <Text style={[styles.habitName, completed && styles.habitNameCompleted]}>
                      {habit.name}
                    </Text>
                    <View style={styles.habitMeta}>
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: categoryInfo.color + '20' },
                        ]}
                      >
                        <Ionicons
                          name={categoryInfo.icon as any}
                          size={12}
                          color={categoryInfo.color}
                        />
                        <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
                          {categoryInfo.label}
                        </Text>
                      </View>
                      {habit.streak > 0 && (
                        <View style={styles.streakBadge}>
                          <Ionicons name="flame" size={14} color={Colors.warning} />
                          <Text style={styles.streakText}>{habit.streak} day streak</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Habit ✨</Text>
            <TextInput
              style={styles.input}
              placeholder="Habit name"
              value={newHabitName}
              onChangeText={setNewHabitName}
              autoFocus
            />
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryOption,
                    selectedCategory === cat.key && {
                      backgroundColor: cat.color,
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.key)}
                >
                  <Ionicons
                    name={cat.icon as any}
                    size={16}
                    color={selectedCategory === cat.key ? '#fff' : cat.color}
                  />
                  <Text
                    style={[
                      styles.categoryOptionText,
                      { color: selectedCategory === cat.key ? '#fff' : cat.color },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setNewHabitName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={createHabit}
              >
                <Text style={styles.saveButtonText}>Add Habit</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitCardCompleted: {
    backgroundColor: Colors.secondaryBg,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  habitNameCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '500',
  },
  // Modal
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: Colors.background,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  categoryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
});
