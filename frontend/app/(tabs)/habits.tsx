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
import { Habit, HabitLog, LaundryEntry } from '../../src/types';

interface HabitCategory {
  id: string;
  key: string;
  label: string;
  color: string;
  icon: string;
  is_default: boolean;
}

const CATEGORY_ICONS = [
  'heart', 'person', 'rocket', 'star', 'fitness', 'book', 
  'cafe', 'bulb', 'trophy', 'musical-notes', 'brush', 'game-controller'
];

const CATEGORY_COLORS = [
  '#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#06B6D4', '#8B5CF6', '#F97316', '#14B8A6', '#6366F1', '#A855F7'
];

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [laundry, setLaundry] = useState<LaundryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'habits' | 'laundry'>('habits');
  
  // Modals
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLaundryModal, setShowLaundryModal] = useState(false);
  
  // Habit form
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('personal');
  
  // Category form
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [newCategoryIcon, setNewCategoryIcon] = useState(CATEGORY_ICONS[0]);
  
  // Laundry form
  const [newLaundryName, setNewLaundryName] = useState('');
  const [newLaundryFrequency, setNewLaundryFrequency] = useState('7');
  
  const today = getToday();

  const fetchData = useCallback(async () => {
    try {
      const [habitsData, logsData, categoriesData, laundryData] = await Promise.all([
        api.get('/habits'),
        api.get(`/habits/logs/${today}`),
        api.get('/categories/habits'),
        api.get('/laundry'),
      ]);
      setHabits(habitsData);
      setLogs(logsData);
      setCategories(categoriesData);
      setLaundry(laundryData);
    } catch (error) {
      console.error('Error fetching data:', error);
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
      setShowHabitModal(false);
      setNewHabitName('');
      await fetchData();
    } catch (error) {
      console.error('Error creating habit:', error);
    }
  };

  const createCategory = async () => {
    if (!newCategoryLabel.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    try {
      await api.post('/categories/habits', {
        label: newCategoryLabel,
        color: newCategoryColor,
        icon: newCategoryIcon,
      });
      setShowCategoryModal(false);
      setNewCategoryLabel('');
      await fetchData();
    } catch (error) {
      console.error('Error creating category:', error);
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

  const deleteCategory = async (categoryKey: string) => {
    Alert.alert('Delete Category', 'Are you sure? Habits using this category will not be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/categories/habits/${categoryKey}`);
            await fetchData();
          } catch (error) {
            console.error('Error deleting category:', error);
          }
        },
      },
    ]);
  };

  const markLaundryDone = async (category: string) => {
    try {
      await api.post('/laundry', {
        category,
        last_done: today,
      });
      await fetchData();
    } catch (error) {
      console.error('Error updating laundry:', error);
    }
  };

  const createLaundryCategory = async () => {
    if (!newLaundryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    try {
      await api.post(`/laundry/category?name=${encodeURIComponent(newLaundryName)}&frequency_days=${newLaundryFrequency}`);
      setShowLaundryModal(false);
      setNewLaundryName('');
      setNewLaundryFrequency('7');
      await fetchData();
    } catch (error) {
      console.error('Error creating laundry category:', error);
    }
  };

  const deleteLaundryCategory = async (category: string) => {
    Alert.alert('Delete Category', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/laundry/${category}`);
            await fetchData();
          } catch (error) {
            console.error('Error deleting laundry category:', error);
          }
        },
      },
    ]);
  };

  const isHabitCompleted = (habitId: string) => {
    return logs.find((l) => l.habit_id === habitId)?.completed || false;
  };

  const getCategoryInfo = (categoryKey: string) => {
    return categories.find((c) => c.key === categoryKey) || {
      key: categoryKey,
      label: categoryKey,
      color: Colors.personal,
      icon: 'star'
    };
  };

  const getDaysAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const todayDate = new Date(today);
    const diff = Math.floor((todayDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day ago';
    return `${diff} days ago`;
  };

  const getLaundryStatus = (item: LaundryEntry) => {
    const date = new Date(item.last_done);
    const todayDate = new Date(today);
    const diff = Math.floor((todayDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = item.frequency_days || 7;
    
    if (diff >= frequency) return { color: Colors.error, text: 'Overdue!' };
    if (diff >= frequency - 2) return { color: Colors.warning, text: 'Due soon' };
    return { color: Colors.success, text: 'Good' };
  };

  const getLaundryIcon = (category: string) => {
    switch (category) {
      case 'clothes': return 'shirt';
      case 'bedding': return 'bed';
      case 'gym_clothes': return 'fitness';
      default: return 'basket';
    }
  };

  const formatCategory = (cat: string) => {
    return cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
        <Text style={styles.title}>
          {activeTab === 'habits' ? 'Habits' : 'Laundry'} 
          {activeTab === 'habits' ? ' ✨' : ' 🧺'}
        </Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => activeTab === 'habits' ? setShowHabitModal(true) : setShowLaundryModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'habits' && styles.activeTab]}
          onPress={() => setActiveTab('habits')}
        >
          <Ionicons
            name="checkbox"
            size={20}
            color={activeTab === 'habits' ? Colors.primary : Colors.textLight}
          />
          <Text style={[styles.tabText, activeTab === 'habits' && styles.activeTabText]}>
            Habits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'laundry' && styles.activeTab]}
          onPress={() => setActiveTab('laundry')}
        >
          <Ionicons
            name="basket"
            size={20}
            color={activeTab === 'laundry' ? Colors.primary : Colors.textLight}
          />
          <Text style={[styles.tabText, activeTab === 'laundry' && styles.activeTabText]}>
            Laundry
          </Text>
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
        {activeTab === 'habits' ? (
          <>
            {/* Progress Summary */}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                {completedCount}/{habits.length} completed today
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${habits.length > 0 ? (completedCount / habits.length) * 100 : 0}%` }
                  ]} 
                />
              </View>
            </Card>

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
          </>
        ) : (
          <>
            {/* Laundry List */}
            {laundry.map((item) => {
              const status = getLaundryStatus(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  onLongPress={() => deleteLaundryCategory(item.category)}
                >
                  <Card style={styles.laundryCard}>
                    <View style={styles.laundryHeader}>
                      <View style={[styles.laundryIcon, { backgroundColor: Colors.primaryBg }]}>
                        <Ionicons
                          name={getLaundryIcon(item.category) as any}
                          size={24}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={styles.laundryInfo}>
                        <Text style={styles.laundryCategory}>{formatCategory(item.category)}</Text>
                        <Text style={styles.laundryDate}>
                          Last done: {getDaysAgo(item.last_done)} • Every {item.frequency_days} days
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.markDoneButton}
                      onPress={() => markLaundryDone(item.category)}
                    >
                      <Ionicons name="checkmark" size={18} color={Colors.secondary} />
                      <Text style={styles.markDoneText}>Mark as Done</Text>
                    </TouchableOpacity>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal visible={showHabitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>New Habit ✨</Text>
              <TextInput
                style={styles.input}
                placeholder="Habit name"
                value={newHabitName}
                onChangeText={setNewHabitName}
                autoFocus
              />
              
              <View style={styles.categoryHeader}>
                <Text style={styles.inputLabel}>Category</Text>
                <TouchableOpacity onPress={() => {
                  setShowHabitModal(false);
                  setTimeout(() => setShowCategoryModal(true), 300);
                }}>
                  <Text style={styles.addCategoryLink}>+ Add Category</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryScrollContent}
              >
                {categories.map((cat) => (
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
                    onLongPress={() => !cat.is_default && deleteCategory(cat.key)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={18}
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
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowHabitModal(false);
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
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>New Category 🎨</Text>
              <TextInput
                style={styles.input}
                placeholder="Category name"
                value={newCategoryLabel}
                onChangeText={setNewCategoryLabel}
                autoFocus
              />
              
              <Text style={styles.inputLabel}>Icon</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.iconScroll}
              >
                {CATEGORY_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      newCategoryIcon === icon && styles.iconOptionSelected,
                    ]}
                    onPress={() => setNewCategoryIcon(icon)}
                  >
                    <Ionicons
                      name={icon as any}
                      size={22}
                      color={newCategoryIcon === icon ? '#fff' : Colors.text}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <Text style={styles.inputLabel}>Color</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.colorScroll}
              >
                {CATEGORY_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newCategoryColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setNewCategoryColor(color)}
                  >
                    {newCategoryColor === color && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowCategoryModal(false);
                    setNewCategoryLabel('');
                    setTimeout(() => setShowHabitModal(true), 300);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={async () => {
                    await createCategory();
                    setTimeout(() => setShowHabitModal(true), 300);
                  }}
                >
                  <Text style={styles.saveButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Add Laundry Category Modal */}
      <Modal visible={showLaundryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Laundry Category 🧺</Text>
            <TextInput
              style={styles.input}
              placeholder="Category name (e.g., Towels)"
              value={newLaundryName}
              onChangeText={setNewLaundryName}
            />
            <TextInput
              style={styles.input}
              placeholder="Frequency (days)"
              value={newLaundryFrequency}
              onChangeText={setNewLaundryFrequency}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowLaundryModal(false);
                  setNewLaundryName('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={createLaundryCategory}
              >
                <Text style={styles.saveButtonText}>Add</Text>
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
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    ...Shadows.small,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: Colors.primaryBg,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  summaryCard: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 4,
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
    flexWrap: 'wrap',
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
  // Laundry
  laundryCard: {
    marginBottom: 12,
  },
  laundryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  laundryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  laundryInfo: {
    flex: 1,
  },
  laundryCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  laundryDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  markDoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: Colors.secondaryBg,
    borderRadius: 10,
  },
  markDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary,
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
    maxHeight: '80%',
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
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  addCategoryLink: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryScrollContent: {
    paddingRight: 20,
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  iconScroll: {
    marginBottom: 16,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginRight: 8,
  },
  iconOptionSelected: {
    backgroundColor: Colors.primary,
  },
  colorScroll: {
    marginBottom: 20,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
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
