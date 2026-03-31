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
import { api, getToday, formatDate } from '../../src/utils/api';
import { WorkoutEntry, Exercise } from '../../src/types';

const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Full Body', 'Cardio', 'Custom'];

export default function FitnessScreen() {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [workoutType, setWorkoutType] = useState('Push');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  
  // Exercise input
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  
  const today = getToday();

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get(`/fitness/history/30`);
      setWorkouts(data);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const addExercise = () => {
    if (!exerciseName || !sets || !reps) {
      Alert.alert('Error', 'Please fill exercise name, sets, and reps');
      return;
    }
    setExercises([...exercises, {
      name: exerciseName,
      sets: parseInt(sets),
      reps: parseInt(reps),
      weight: weight ? parseFloat(weight) : 0,
    }]);
    setExerciseName('');
    setSets('');
    setReps('');
    setWeight('');
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const saveWorkout = async () => {
    if (exercises.length === 0) {
      Alert.alert('Error', 'Please add at least one exercise');
      return;
    }
    try {
      await api.post('/fitness', {
        date: today,
        workout_type: workoutType,
        exercises,
        notes: notes || null,
        duration_minutes: duration ? parseInt(duration) : 0,
      });
      setShowModal(false);
      setExercises([]);
      setNotes('');
      setDuration('');
      await fetchData();
    } catch (error) {
      console.error('Error saving workout:', error);
    }
  };

  const deleteWorkout = async (workoutId: string) => {
    Alert.alert('Delete Workout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/fitness/${workoutId}`);
            await fetchData();
          } catch (error) {
            console.error('Error deleting workout:', error);
          }
        },
      },
    ]);
  };

  const getWorkoutIcon = (type: string) => {
    switch (type) {
      case 'Push': return 'arrow-up';
      case 'Pull': return 'arrow-down';
      case 'Legs': return 'body';
      case 'Full Body': return 'fitness';
      case 'Cardio': return 'heart';
      default: return 'barbell';
    }
  };

  const todayWorkouts = workouts.filter(w => w.date === today);
  const recentWorkouts = workouts.filter(w => w.date !== today);

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
          <Text style={styles.title}>Fitness 💪</Text>
          <Text style={styles.subtitle}>
            {todayWorkouts.length} workout(s) today
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
        {todayWorkouts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today</Text>
            {todayWorkouts.map((workout) => (
              <TouchableOpacity
                key={workout.id}
                onLongPress={() => deleteWorkout(workout.id)}
              >
                <Card style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <View style={[styles.workoutIcon, { backgroundColor: Colors.primaryBg }]}>
                      <Ionicons
                        name={getWorkoutIcon(workout.workout_type) as any}
                        size={24}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={styles.workoutInfo}>
                      <Text style={styles.workoutType}>{workout.workout_type}</Text>
                      <Text style={styles.workoutMeta}>
                        {workout.exercises.length} exercises
                        {workout.duration_minutes ? ` • ${workout.duration_minutes} min` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.exerciseList}>
                    {workout.exercises.slice(0, 3).map((ex, i) => (
                      <Text key={i} style={styles.exerciseItem}>
                        • {ex.name}: {ex.sets}x{ex.reps}
                        {ex.weight ? ` @ ${ex.weight}lbs` : ''}
                      </Text>
                    ))}
                    {workout.exercises.length > 3 && (
                      <Text style={styles.moreExercises}>
                        +{workout.exercises.length - 3} more exercises
                      </Text>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {recentWorkouts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            {recentWorkouts.slice(0, 10).map((workout) => (
              <TouchableOpacity
                key={workout.id}
                onLongPress={() => deleteWorkout(workout.id)}
              >
                <Card style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <View style={[styles.workoutIcon, { backgroundColor: Colors.secondaryBg }]}>
                      <Ionicons
                        name={getWorkoutIcon(workout.workout_type) as any}
                        size={24}
                        color={Colors.secondary}
                      />
                    </View>
                    <View style={styles.workoutInfo}>
                      <Text style={styles.workoutType}>{workout.workout_type}</Text>
                      <Text style={styles.workoutMeta}>
                        {formatDate(workout.date)} • {workout.exercises.length} exercises
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        ) : todayWorkouts.length === 0 && (
          <Card style={styles.emptyCard}>
            <Ionicons name="fitness-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No workouts yet</Text>
            <Text style={styles.emptySubtext}>Tap + to log your first workout</Text>
          </Card>
        )}
      </ScrollView>

      {/* Add Workout Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Log Workout 🏋️</Text>
              
              <Text style={styles.inputLabel}>Workout Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {WORKOUT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      workoutType === type && styles.typeButtonSelected,
                    ]}
                    onPress={() => setWorkoutType(type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        workoutType === type && styles.typeButtonTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Add Exercise</Text>
              <TextInput
                style={styles.input}
                placeholder="Exercise name"
                value={exerciseName}
                onChangeText={setExerciseName}
              />
              <View style={styles.exerciseInputRow}>
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder="Sets"
                  value={sets}
                  onChangeText={setSets}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder="Reps"
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder="lbs"
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity style={styles.addExerciseBtn} onPress={addExercise}>
                <Ionicons name="add" size={18} color={Colors.primary} />
                <Text style={styles.addExerciseText}>Add Exercise</Text>
              </TouchableOpacity>

              {exercises.length > 0 && (
                <View style={styles.exercisesList}>
                  {exercises.map((ex, i) => (
                    <View key={i} style={styles.exerciseRow}>
                      <Text style={styles.exerciseRowText}>
                        {ex.name}: {ex.sets}x{ex.reps}
                        {ex.weight ? ` @ ${ex.weight}lbs` : ''}
                      </Text>
                      <TouchableOpacity onPress={() => removeExercise(i)}>
                        <Ionicons name="close-circle" size={20} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Duration (minutes)"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowModal(false);
                    setExercises([]);
                    setNotes('');
                    setDuration('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveWorkout}
                >
                  <Text style={styles.saveButtonText}>Save Workout</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  workoutCard: {
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutType: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  workoutMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  exerciseList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  exerciseItem: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  moreExercises: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 4,
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
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  typeScroll: {
    marginBottom: 16,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  typeButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    color: '#fff',
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
  exerciseInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallInput: {
    flex: 1,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: Colors.primaryBg,
    marginBottom: 16,
  },
  addExerciseText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  exercisesList: {
    marginBottom: 16,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 6,
  },
  exerciseRowText: {
    fontSize: 14,
    color: Colors.text,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
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
});
