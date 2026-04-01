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
import { useTheme, getShadows } from '../../src/utils/theme';
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

const CATEGORY_ICONS = ['heart', 'person', 'rocket', 'star', 'fitness', 'book', 'cafe', 'bulb', 'trophy', 'musical-notes', 'brush', 'game-controller'];
const CATEGORY_COLORS = ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#F97316', '#14B8A6', '#6366F1', '#A855F7'];

export default function HabitsScreen() {
  const { theme } = useTheme();
  const shadows = getShadows(theme);
  
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [categories, setCategories] = useState<HabitCategory[]>([]);
  const [laundry, setLaundry] = useState<LaundryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'habits' | 'laundry'>('habits');
  
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showLaundryModal, setShowLaundryModal] = useState(false);
  
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('personal');
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [newCategoryIcon, setNewCategoryIcon] = useState(CATEGORY_ICONS[0]);
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

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
    if (!newHabitName.trim()) { Alert.alert('Error', 'Please enter a habit name'); return; }
    try {
      await api.post('/habits', { name: newHabitName, category: selectedCategory, icon: 'star' });
      setShowHabitModal(false);
      setNewHabitName('');
      await fetchData();
    } catch (error) {
      console.error('Error creating habit:', error);
    }
  };

  const createCategory = async () => {
    if (!newCategoryLabel.trim()) { Alert.alert('Error', 'Please enter a category name'); return; }
    try {
      await api.post('/categories/habits', { label: newCategoryLabel, color: newCategoryColor, icon: newCategoryIcon });
      setShowCategoryModal(false);
      setNewCategoryLabel('');
      await fetchData();
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const deleteHabit = async (habitId: string) => {
    Alert.alert('Delete Habit', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/habits/${habitId}`); await fetchData(); } },
    ]);
  };

  const markLaundryDone = async (category: string) => {
    try {
      await api.post('/laundry', { category, last_done: today });
      await fetchData();
    } catch (error) {
      console.error('Error updating laundry:', error);
    }
  };

  const createLaundryCategory = async () => {
    if (!newLaundryName.trim()) { Alert.alert('Error', 'Please enter a category name'); return; }
    try {
      await api.post(`/laundry/category?name=${encodeURIComponent(newLaundryName)}&frequency_days=${newLaundryFrequency}`);
      setShowLaundryModal(false);
      setNewLaundryName('');
      await fetchData();
    } catch (error) {
      console.error('Error creating laundry category:', error);
    }
  };

  const isHabitCompleted = (habitId: string) => logs.find((l) => l.habit_id === habitId)?.completed || false;
  const getCategoryInfo = (categoryKey: string) => categories.find((c) => c.key === categoryKey) || { key: categoryKey, label: categoryKey, color: theme.personal, icon: 'star' };
  
  const getDaysAgo = (dateStr: string) => {
    const diff = Math.floor((new Date(today).getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day ago';
    return `${diff} days ago`;
  };

  const getLaundryStatus = (item: LaundryEntry) => {
    const diff = Math.floor((new Date(today).getTime() - new Date(item.last_done).getTime()) / (1000 * 60 * 60 * 24));
    const frequency = item.frequency_days || 7;
    if (diff >= frequency) return { color: theme.error, text: 'Overdue!' };
    if (diff >= frequency - 2) return { color: theme.warning, text: 'Due soon' };
    return { color: theme.success, text: 'Good' };
  };

  const getLaundryIcon = (category: string) => {
    switch (category) {
      case 'clothes': return 'shirt';
      case 'bedding': return 'bed';
      case 'gym_clothes': return 'fitness';
      default: return 'basket';
    }
  };

  const formatCategory = (cat: string) => cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const completedCount = habits.filter((h) => isHabitCompleted(h.id)).length;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{activeTab === 'habits' ? 'Habits ✨' : 'Laundry 🧺'}</Text>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }, shadows.medium]} onPress={() => activeTab === 'habits' ? setShowHabitModal(true) : setShowLaundryModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: theme.card }, shadows.small]}>
        <TouchableOpacity style={[styles.tab, activeTab === 'habits' && { backgroundColor: theme.primaryBg }]} onPress={() => setActiveTab('habits')}>
          <Ionicons name="checkbox" size={20} color={activeTab === 'habits' ? theme.primary : theme.textLight} />
          <Text style={[styles.tabText, activeTab === 'habits' && { color: theme.primary, fontWeight: '600' }]}>Habits</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'laundry' && { backgroundColor: theme.primaryBg }]} onPress={() => setActiveTab('laundry')}>
          <Ionicons name="basket" size={20} color={activeTab === 'laundry' ? theme.primary : theme.textLight} />
          <Text style={[styles.tabText, activeTab === 'laundry' && { color: theme.primary, fontWeight: '600' }]}>Laundry</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />} showsVerticalScrollIndicator={false}>
        {activeTab === 'habits' ? (
          <>
            <View style={[styles.summaryCard, { backgroundColor: theme.card }, shadows.small]}>
              <Text style={[styles.summaryText, { color: theme.textSecondary }]}>{completedCount}/{habits.length} completed today</Text>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { backgroundColor: theme.secondary, width: `${habits.length > 0 ? (completedCount / habits.length) * 100 : 0}%` }]} />
              </View>
            </View>

            {habits.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.card }, shadows.small]}>
                <Ionicons name="checkbox-outline" size={48} color={theme.textLight} />
                <Text style={[styles.emptyText, { color: theme.text }]}>No habits yet</Text>
                <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Tap + to add your first habit</Text>
              </View>
            ) : (
              habits.map((habit) => {
                const categoryInfo = getCategoryInfo(habit.category);
                const completed = isHabitCompleted(habit.id);
                return (
                  <TouchableOpacity key={habit.id} onLongPress={() => deleteHabit(habit.id)} activeOpacity={0.8}>
                    <View style={[styles.habitCard, { backgroundColor: completed ? theme.secondaryBg : theme.card }, shadows.small]}>
                      <TouchableOpacity style={[styles.checkbox, { borderColor: categoryInfo.color }, completed && { backgroundColor: categoryInfo.color }]} onPress={() => toggleHabit(habit.id)}>
                        {completed && <Ionicons name="checkmark" size={18} color="#fff" />}
                      </TouchableOpacity>
                      <View style={styles.habitInfo}>
                        <Text style={[styles.habitName, { color: theme.text }, completed && { textDecorationLine: 'line-through', color: theme.textSecondary }]}>{habit.name}</Text>
                        <View style={styles.habitMeta}>
                          <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '20' }]}>
                            <Ionicons name={categoryInfo.icon as any} size={12} color={categoryInfo.color} />
                            <Text style={[styles.categoryText, { color: categoryInfo.color }]}>{categoryInfo.label}</Text>
                          </View>
                          {habit.streak > 0 && (
                            <View style={styles.streakBadge}>
                              <Ionicons name="flame" size={14} color={theme.warning} />
                              <Text style={[styles.streakText, { color: theme.warning }]}>{habit.streak} day streak</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : (
          laundry.map((item) => {
            const status = getLaundryStatus(item);
            return (
              <View key={item.id} style={[styles.laundryCard, { backgroundColor: theme.card }, shadows.small]}>
                <View style={styles.laundryHeader}>
                  <View style={[styles.laundryIcon, { backgroundColor: theme.primaryBg }]}>
                    <Ionicons name={getLaundryIcon(item.category) as any} size={24} color={theme.primary} />
                  </View>
                  <View style={styles.laundryInfo}>
                    <Text style={[styles.laundryCategory, { color: theme.text }]}>{formatCategory(item.category)}</Text>
                    <Text style={[styles.laundryDate, { color: theme.textSecondary }]}>Last done: {getDaysAgo(item.last_done)} • Every {item.frequency_days} days</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.markDoneButton, { backgroundColor: theme.secondaryBg }]} onPress={() => markLaundryDone(item.category)}>
                  <Ionicons name="checkmark" size={18} color={theme.secondary} />
                  <Text style={[styles.markDoneText, { color: theme.secondary }]}>Mark as Done</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal visible={showHabitModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }, shadows.large]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Habit ✨</Text>
              <TextInput style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]} placeholder="Habit name" placeholderTextColor={theme.textLight} value={newHabitName} onChangeText={setNewHabitName} />
              <View style={styles.categoryHeader}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Category</Text>
                <TouchableOpacity onPress={() => { setShowHabitModal(false); setTimeout(() => setShowCategoryModal(true), 300); }}>
                  <Text style={[styles.addCategoryLink, { color: theme.primary }]}>+ Add Category</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {categories.map((cat) => (
                  <TouchableOpacity key={cat.key} style={[styles.categoryOption, { borderColor: theme.border }, selectedCategory === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]} onPress={() => setSelectedCategory(cat.key)}>
                    <Ionicons name={cat.icon as any} size={18} color={selectedCategory === cat.key ? '#fff' : cat.color} />
                    <Text style={[styles.categoryOptionText, { color: selectedCategory === cat.key ? '#fff' : cat.color }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => { setShowHabitModal(false); setNewHabitName(''); }}>
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={createHabit}>
                  <Text style={styles.saveButtonText}>Add Habit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }, shadows.large]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Category 🎨</Text>
              <TextInput style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]} placeholder="Category name" placeholderTextColor={theme.textLight} value={newCategoryLabel} onChangeText={setNewCategoryLabel} />
              <Text style={[styles.inputLabel, { color: theme.text }]}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                {CATEGORY_ICONS.map((icon) => (
                  <TouchableOpacity key={icon} style={[styles.iconOption, { backgroundColor: theme.background }, newCategoryIcon === icon && { backgroundColor: theme.primary }]} onPress={() => setNewCategoryIcon(icon)}>
                    <Ionicons name={icon as any} size={22} color={newCategoryIcon === icon ? '#fff' : theme.text} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                {CATEGORY_COLORS.map((color) => (
                  <TouchableOpacity key={color} style={[styles.colorOption, { backgroundColor: color }, newCategoryColor === color && styles.colorOptionSelected]} onPress={() => setNewCategoryColor(color)}>
                    {newCategoryColor === color && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => { setShowCategoryModal(false); setNewCategoryLabel(''); setTimeout(() => setShowHabitModal(true), 300); }}>
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={async () => { await createCategory(); setTimeout(() => setShowHabitModal(true), 300); }}>
                  <Text style={styles.saveButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Laundry Modal */}
      <Modal visible={showLaundryModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }, shadows.large]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Laundry Category 🧺</Text>
            <TextInput style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]} placeholder="Category name (e.g., Towels)" placeholderTextColor={theme.textLight} value={newLaundryName} onChangeText={setNewLaundryName} />
            <TextInput style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]} placeholder="Frequency (days)" placeholderTextColor={theme.textLight} value={newLaundryFrequency} onChangeText={setNewLaundryFrequency} keyboardType="numeric" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => { setShowLaundryModal(false); setNewLaundryName(''); }}>
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={createLaundryCategory}>
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 },
  title: { fontSize: 28, fontWeight: '700' },
  addButton: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabText: { fontSize: 14, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  summaryCard: { marginBottom: 16, borderRadius: 16, padding: 16 },
  summaryText: { fontSize: 14, marginBottom: 8 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, borderRadius: 16, padding: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 4 },
  habitCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderRadius: 16, padding: 16 },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  habitInfo: { flex: 1 },
  habitName: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  habitMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  categoryText: { fontSize: 11, fontWeight: '600' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { fontSize: 11, fontWeight: '500' },
  laundryCard: { marginBottom: 12, borderRadius: 16, padding: 16 },
  laundryHeader: { flexDirection: 'row', alignItems: 'center' },
  laundryIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  laundryInfo: { flex: 1 },
  laundryCategory: { fontSize: 16, fontWeight: '600' },
  laundryDate: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  markDoneButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 10 },
  markDoneText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, maxHeight: '80%', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  addCategoryLink: { fontSize: 14, fontWeight: '600' },
  categoryScroll: { marginBottom: 20 },
  categoryOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  categoryOptionText: { fontSize: 13, fontWeight: '600' },
  iconScroll: { marginBottom: 16 },
  iconOption: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  colorScroll: { marginBottom: 20 },
  colorOption: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  colorOptionSelected: { borderWidth: 3, borderColor: '#fff' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelButton: { borderWidth: 1 },
  cancelButtonText: { fontWeight: '600' },
  saveButtonText: { color: '#fff', fontWeight: '600' },
});
