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
import { ProgressRing } from '../../src/components/ProgressRing';
import { api, getToday } from '../../src/utils/api';
import { MealEntry, LaundryEntry } from '../../src/types';

const MEAL_ICONS = {
  breakfast: 'sunny',
  lunch: 'restaurant',
  dinner: 'moon',
  snack: 'cafe',
};

const CALORIE_GOAL = 2000;

export default function NutritionScreen() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [laundry, setLaundry] = useState<LaundryEntry[]>([]);
  const [summary, setSummary] = useState({
    total_calories: 0,
    total_protein: 0,
    total_carbs: 0,
    total_fats: 0,
    meal_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showLaundryModal, setShowLaundryModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'nutrition' | 'laundry'>('nutrition');
  
  // Meal form
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('snack');
  
  const today = getToday();

  const fetchData = useCallback(async () => {
    try {
      const [mealsData, summaryData, laundryData] = await Promise.all([
        api.get(`/nutrition/${today}`),
        api.get(`/nutrition/summary/${today}`),
        api.get('/laundry'),
      ]);
      setMeals(mealsData);
      setSummary(summaryData);
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

  const saveMeal = async () => {
    if (!mealName || !calories) {
      Alert.alert('Error', 'Please enter meal name and calories');
      return;
    }
    try {
      await api.post('/nutrition', {
        date: today,
        name: mealName,
        calories: parseInt(calories),
        protein: protein ? parseInt(protein) : 0,
        carbs: carbs ? parseInt(carbs) : 0,
        fats: fats ? parseInt(fats) : 0,
        meal_type: mealType,
      });
      setShowMealModal(false);
      resetMealForm();
      await fetchData();
    } catch (error) {
      console.error('Error saving meal:', error);
    }
  };

  const resetMealForm = () => {
    setMealName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setMealType('snack');
  };

  const deleteMeal = async (mealId: string) => {
    Alert.alert('Delete Meal', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/nutrition/${mealId}`);
            await fetchData();
          } catch (error) {
            console.error('Error deleting meal:', error);
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

  const getDaysAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const todayDate = new Date(today);
    const diff = Math.floor((todayDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return '1 day ago';
    return `${diff} days ago`;
  };

  const getLaundryStatus = (dateStr: string) => {
    const date = new Date(dateStr);
    const todayDate = new Date(today);
    const diff = Math.floor((todayDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff >= 7) return { color: Colors.error, text: 'Overdue!' };
    if (diff >= 5) return { color: Colors.warning, text: 'Due soon' };
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
    return cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const caloriePercentage = Math.min((summary.total_calories / CALORIE_GOAL) * 100, 100);

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
          {activeTab === 'nutrition' ? 'Nutrition 🍎' : 'Laundry 🧱'}
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'nutrition' && styles.activeTab]}
          onPress={() => setActiveTab('nutrition')}
        >
          <Ionicons
            name="nutrition"
            size={20}
            color={activeTab === 'nutrition' ? Colors.primary : Colors.textLight}
          />
          <Text style={[styles.tabText, activeTab === 'nutrition' && styles.activeTabText]}>
            Nutrition
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
        {activeTab === 'nutrition' ? (
          <>
            {/* Calorie Summary */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <ProgressRing
                  progress={caloriePercentage}
                  size={100}
                  strokeWidth={10}
                  color={caloriePercentage > 100 ? Colors.error : Colors.primary}
                >
                  <Ionicons name="flame" size={32} color={Colors.warning} />
                </ProgressRing>
                <View style={styles.summaryInfo}>
                  <Text style={styles.calorieCount}>{summary.total_calories}</Text>
                  <Text style={styles.calorieGoal}>/ {CALORIE_GOAL} cal</Text>
                  <Text style={styles.mealCount}>{summary.meal_count} meals logged</Text>
                </View>
              </View>
              
              {/* Macros */}
              <View style={styles.macrosRow}>
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{summary.total_protein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{summary.total_carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroDivider} />
                <View style={styles.macroItem}>
                  <Text style={styles.macroValue}>{summary.total_fats}g</Text>
                  <Text style={styles.macroLabel}>Fats</Text>
                </View>
              </View>
            </Card>

            {/* Add Meal Button */}
            <TouchableOpacity style={styles.addMealButton} onPress={() => setShowMealModal(true)}>
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={styles.addMealText}>Log Meal</Text>
            </TouchableOpacity>

            {/* Meals List */}
            {meals.length > 0 ? (
              <View style={styles.mealsList}>
                {meals.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    onLongPress={() => deleteMeal(meal.id)}
                  >
                    <Card style={styles.mealCard}>
                      <View style={[styles.mealIcon, { backgroundColor: Colors.primaryBg }]}>
                        <Ionicons
                          name={MEAL_ICONS[meal.meal_type] as any}
                          size={22}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        <Text style={styles.mealType}>
                          {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
                        </Text>
                      </View>
                      <Text style={styles.mealCalories}>{meal.calories} cal</Text>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <Ionicons name="restaurant-outline" size={48} color={Colors.textLight} />
                <Text style={styles.emptyText}>No meals logged today</Text>
                <Text style={styles.emptySubtext}>Tap "Log Meal" to add your first meal</Text>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Laundry Tracker */}
            {laundry.map((item) => {
              const status = getLaundryStatus(item.last_done);
              return (
                <Card key={item.id} style={styles.laundryCard}>
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
                      <Text style={styles.laundryDate}>Last done: {getDaysAgo(item.last_done)}</Text>
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
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Meal Modal */}
      <Modal visible={showMealModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
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
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
              />
              
              <View style={styles.macroInputRow}>
                <TextInput
                  style={[styles.input, styles.macroInput]}
                  placeholder="Protein (g)"
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.macroInput]}
                  placeholder="Carbs (g)"
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.macroInput]}
                  placeholder="Fats (g)"
                  value={fats}
                  onChangeText={setFats}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.inputLabel}>Meal Type</Text>
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
                    <Ionicons
                      name={MEAL_ICONS[type] as any}
                      size={18}
                      color={mealType === type ? '#fff' : Colors.textSecondary}
                    />
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
                  onPress={() => {
                    setShowMealModal(false);
                    resetMealForm();
                  }}
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
            </ScrollView>
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
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryInfo: {
    marginLeft: 20,
  },
  calorieCount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
  },
  calorieGoal: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  mealCount: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  macroLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16,
    ...Shadows.medium,
  },
  addMealText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  mealsList: {
    gap: 10,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  mealType: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  mealCalories: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
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
    fontSize: 13,
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
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroInput: {
    flex: 1,
    paddingHorizontal: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  mealTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  mealTypeTextSelected: {
    color: '#fff',
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
