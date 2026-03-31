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
import { Ionicons } from '@expo/vector-icons'
import { Colors, Shadows } from '../../src/utils/colors';
import { Card } from '../../src/components/Card';
import { ProgressRing } from '../../src/components/ProgressRing';
import { api, getToday } from '../../src/utils/api';
import { MealEntry, WaterEntry } from '../../src/types';

const MEAL_ICONS = {
  breakfast: 'sunny',
  lunch: 'restaurant',
  dinner: 'moon',
  snack: 'cafe',
};

const CALORIE_GOAL = 2000;

interface WaterHistory {
  date: string;
  cups: number;
  goal: number;
}

export default function NutritionScreen() {
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [water, setWater] = useState<WaterEntry | null>(null);
  const [waterHistory, setWaterHistory] = useState<WaterHistory[]>([]);
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
  const [activeTab, setActiveTab] = useState<'nutrition' | 'water'>('nutrition');
  
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
      const [mealsData, summaryData, waterData, waterHistoryData] = await Promise.all([
        api.get(`/nutrition/${today}`),
        api.get(`/nutrition/summary/${today}`),
        api.get(`/water/${today}`),
        api.get('/water/history/7'),
      ]);
      setMeals(mealsData);
      setSummary(summaryData);
      setWater(waterData);
      setWaterHistory(waterHistoryData);
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

  const addWater = async (cups: number = 1) => {
    try {
      await api.post(`/water/${today}/add?cups=${cups}`);
      await fetchData();
    } catch (error) {
      console.error('Error adding water:', error);
    }
  };

  const caloriePercentage = Math.min((summary.total_calories / CALORIE_GOAL) * 100, 100);
  const waterPercentage = water ? Math.min((water.cups / water.goal) * 100, 100) : 0;

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
          {activeTab === 'nutrition' ? 'Nutrition 🍎' : 'Hydration 💧'}
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
          style={[styles.tab, activeTab === 'water' && styles.activeTab]}
          onPress={() => setActiveTab('water')}
        >
          <Ionicons
            name="water"
            size={20}
            color={activeTab === 'water' ? Colors.secondary : Colors.textLight}
          />
          <Text style={[styles.tabText, activeTab === 'water' && styles.activeTabText]}>
            Water
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
                          {meal.time ? ` • ${meal.time}` : ''}
                        </Text>
                      </View>
                      <View style={styles.mealNutrition}>
                        <Text style={styles.mealCalories}>{meal.calories} cal</Text>
                        {(meal.protein || meal.carbs || meal.fats) ? (
                          <Text style={styles.mealMacros}>
                            P:{meal.protein}g C:{meal.carbs}g F:{meal.fats}g
                          </Text>
                        ) : null}
                      </View>
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
            {/* Water Summary */}
            <Card style={styles.waterSummaryCard}>
              <View style={styles.waterSummaryRow}>
                <ProgressRing
                  progress={waterPercentage}
                  size={120}
                  strokeWidth={12}
                  color={Colors.secondary}
                >
                  <Ionicons name="water" size={40} color={Colors.secondary} />
                </ProgressRing>
                <View style={styles.waterSummaryInfo}>
                  <Text style={styles.waterCount}>{water?.cups || 0}</Text>
                  <Text style={styles.waterGoal}>/ {water?.goal || 8} cups</Text>
                  <Text style={styles.waterSubtext}>
                    {water && water.cups >= water.goal 
                      ? '🎉 Goal reached!' 
                      : `${(water?.goal || 8) - (water?.cups || 0)} cups to go`}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Quick Add Buttons */}
            <View style={styles.quickAddRow}>
              <TouchableOpacity 
                style={styles.quickAddButton}
                onPress={() => addWater(1)}
              >
                <View style={[styles.quickAddIcon, { backgroundColor: Colors.secondaryBg }]}>
                  <Ionicons name="water" size={24} color={Colors.secondary} />
                </View>
                <Text style={styles.quickAddText}>+1 Cup</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAddButton}
                onPress={() => addWater(2)}
              >
                <View style={[styles.quickAddIcon, { backgroundColor: Colors.secondaryBg }]}>
                  <Ionicons name="water" size={24} color={Colors.secondary} />
                  <Ionicons name="water" size={18} color={Colors.secondary} style={styles.secondWaterIcon} />
                </View>
                <Text style={styles.quickAddText}>+2 Cups</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickAddButton}
                onPress={() => addWater(3)}
              >
                <View style={[styles.quickAddIcon, { backgroundColor: Colors.secondaryBg }]}>
                  <Text style={styles.quickAddNumber}>+3</Text>
                </View>
                <Text style={styles.quickAddText}>+3 Cups</Text>
              </TouchableOpacity>
            </View>

            {/* Water History */}
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>This Week</Text>
              <View style={styles.historyGrid}>
                {waterHistory.map((day, index) => {
                  const dayName = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                  const percentage = Math.min((day.cups / day.goal) * 100, 100);
                  const isToday = day.date === today;
                  
                  return (
                    <View key={day.date} style={styles.historyDay}>
                      <Text style={[styles.historyDayName, isToday && styles.historyDayNameToday]}>
                        {dayName}
                      </Text>
                      <View style={styles.historyBar}>
                        <View 
                          style={[
                            styles.historyBarFill, 
                            { 
                              height: `${percentage}%`,
                              backgroundColor: percentage >= 100 ? Colors.secondary : Colors.primaryLight
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.historyCups}>{day.cups}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Water Logs for Today */}
            {water?.logs && water.logs.length > 0 && (
              <Card style={styles.logsCard}>
                <Text style={styles.logsTitle}>Today's Log</Text>
                {water.logs.map((log: any, index: number) => (
                  <View key={index} style={styles.logItem}>
                    <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.logTime}>{log.time}</Text>
                    <Text style={styles.logCups}>+{log.cups} cup{log.cups > 1 ? 's' : ''}</Text>
                  </View>
                ))}
              </Card>
            )}
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
  mealNutrition: {
    alignItems: 'flex-end',
  },
  mealCalories: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  mealMacros: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
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
  // Water Tab Styles
  waterSummaryCard: {
    marginBottom: 20,
    padding: 24,
  },
  waterSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  waterSummaryInfo: {
    alignItems: 'center',
  },
  waterCount: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.secondary,
  },
  waterGoal: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  waterSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
  },
  quickAddRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  quickAddButton: {
    alignItems: 'center',
  },
  quickAddIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Shadows.small,
  },
  secondWaterIcon: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  quickAddNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.secondary,
  },
  quickAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  historySection: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  historyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    ...Shadows.small,
  },
  historyDay: {
    alignItems: 'center',
    flex: 1,
  },
  historyDayName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  historyDayNameToday: {
    color: Colors.primary,
    fontWeight: '600',
  },
  historyBar: {
    width: 20,
    height: 60,
    backgroundColor: Colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  historyBarFill: {
    width: '100%',
    borderRadius: 10,
  },
  historyCups: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  logsCard: {
    marginBottom: 16,
  },
  logsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logTime: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  logCups: {
    fontSize: 13,
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
