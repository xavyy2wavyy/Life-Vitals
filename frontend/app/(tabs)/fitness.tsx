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
import { api, getToday, formatDate } from '../../src/utils/api';
import { WorkoutEntry, Exercise } from '../../src/types';

const WORKOUT_TYPES = ['Push', 'Pull', 'Legs', 'Full Body', 'Cardio', 'Custom'];

export default function FitnessScreen() {
  const { theme } = useTheme();
  const shadows = getShadows(theme);
  
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [workoutType, setWorkoutType] = useState('Push');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
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

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const addExercise = () => {
    if (!exerciseName || !sets || !reps) { Alert.alert('Error', 'Please fill exercise name, sets, and reps'); return; }
    setExercises([...exercises, { name: exerciseName, sets: parseInt(sets), reps: parseInt(reps), weight: weight ? parseFloat(weight) : 0 }]);
    setExerciseName(''); setSets(''); setReps(''); setWeight('');
  };

  const removeExercise = (index: number) => setExercises(exercises.filter((_, i) => i !== index));

  const saveWorkout = async () => {
    if (exercises.length === 0) { Alert.alert('Error', 'Please add at least one exercise'); return; }
    try {
      await api.post('/fitness', { date: today, workout_type: workoutType, exercises, notes: notes || null, duration_minutes: duration ? parseInt(duration) : 0 });
      setShowModal(false); setExercises([]); setNotes(''); setDuration(''); await fetchData();
    } catch (error) {
      console.error('Error saving workout:', error);
    }
  };

  const deleteWorkout = async (workoutId: string) => {
    Alert.alert('Delete Workout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.delete(`/fitness/${workoutId}`); await fetchData(); } },
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Fitness 💪</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{todayWorkouts.length} workout(s) today</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }, shadows.medium]} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />} showsVerticalScrollIndicator={false}>
        {todayWorkouts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Today</Text>
            {todayWorkouts.map((workout) => (
              <TouchableOpacity key={workout.id} onLongPress={() => deleteWorkout(workout.id)}>
                <View style={[styles.workoutCard, { backgroundColor: theme.card }, shadows.small]}>
                  <View style={styles.workoutHeader}>
                    <View style={[styles.workoutIcon, { backgroundColor: theme.primaryBg }]}>
                      <Ionicons name={getWorkoutIcon(workout.workout_type) as any} size={24} color={theme.primary} />
                    </View>
                    <View style={styles.workoutInfo}>
                      <Text style={[styles.workoutType, { color: theme.text }]}>{workout.workout_type}</Text>
                      <Text style={[styles.workoutMeta, { color: theme.textSecondary }]}>{workout.exercises.length} exercises{workout.duration_minutes ? ` • ${workout.duration_minutes} min` : ''}</Text>
                    </View>
                  </View>
                  <View style={[styles.exerciseList, { borderTopColor: theme.border }]}>
                    {workout.exercises.slice(0, 3).map((ex, i) => (
                      <Text key={i} style={[styles.exerciseItem, { color: theme.textSecondary }]}>• {ex.name}: {ex.sets}x{ex.reps}{ex.weight ? ` @ ${ex.weight}lbs` : ''}</Text>
                    ))}
                    {workout.exercises.length > 3 && <Text style={[styles.moreExercises, { color: theme.primary }]}>+{workout.exercises.length - 3} more exercises</Text>}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {recentWorkouts.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Recent Workouts</Text>
            {recentWorkouts.slice(0, 10).map((workout) => (
              <TouchableOpacity key={workout.id} onLongPress={() => deleteWorkout(workout.id)}>
                <View style={[styles.workoutCard, { backgroundColor: theme.card }, shadows.small]}>
                  <View style={styles.workoutHeader}>
                    <View style={[styles.workoutIcon, { backgroundColor: theme.secondaryBg }]}>
                      <Ionicons name={getWorkoutIcon(workout.workout_type) as any} size={24} color={theme.secondary} />
                    </View>
                    <View style={styles.workoutInfo}>
                      <Text style={[styles.workoutType, { color: theme.text }]}>{workout.workout_type}</Text>
                      <Text style={[styles.workoutMeta, { color: theme.textSecondary }]}>{formatDate(workout.date)} • {workout.exercises.length} exercises</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : todayWorkouts.length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: theme.card }, shadows.small]}>
            <Ionicons name="fitness-outline" size={48} color={theme.textLight} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No workouts yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Tap + to log your first workout</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }, shadows.large]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Log Workout 🏋️</Text>
              
              <Text style={[styles.inputLabel, { color: theme.text }]}>Workout Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {WORKOUT_TYPES.map((type) => (
                  <TouchableOpacity key={type} style={[styles.typeButton, { backgroundColor: theme.background, borderColor: theme.border }, workoutType === type && { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setWorkoutType(type)}>
                    <Text style={[styles.typeButtonText, { color: theme.textSecondary }, workoutType === type && { color: '#fff' }]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.text }]}>Add Exercise</Text>
              <TextInput style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]} placeholder="Exercise name" placeholderTextColor={theme.textLight} value={exerciseName} onChangeText={setExerciseName} />
              <View style={styles.exerciseInputRow}>
                <TextInput style={[styles.input, styles.smallInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]} placeholder="Sets" placeholderTextColor={theme.textLight} value={sets} onChangeText={setSets} keyboardType="numeric" />
                <TextInput style={[styles.input, styles.smallInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]} placeholder="Reps" placeholderTextColor={theme.textLight} value={reps} onChangeText={setReps} keyboardType="numeric" />
                <TextInput style={[styles.input, styles.smallInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]} placeholder="lbs" placeholderTextColor={theme.textLight} value={weight} onChangeText={setWeight} keyboardType="numeric" />
              </View>
              <TouchableOpacity style={[styles.addExerciseBtn, { backgroundColor: theme.primaryBg }]} onPress={addExercise}>
                <Ionicons name="add" size={18} color={theme.primary} />
                <Text style={[styles.addExerciseText, { color: theme.primary }]}>Add Exercise</Text>
              </TouchableOpacity>

              {exercises.length > 0 && (
                <View style={styles.exercisesList}>
                  {exercises.map((ex, i) => (
                    <View key={i} style={[styles.exerciseRow, { backgroundColor: theme.background }]}>
                      <Text style={[styles.exerciseRowText, { color: theme.text }]}>{ex.name}: {ex.sets}x{ex.reps}{ex.weight ? ` @ ${ex.weight}lbs` : ''}</Text>
                      <TouchableOpacity onPress={() => removeExercise(i)}><Ionicons name="close-circle" size={20} color={theme.error} /></TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TextInput style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]} placeholder="Duration (minutes)" placeholderTextColor={theme.textLight} value={duration} onChangeText={setDuration} keyboardType="numeric" />
              <TextInput style={[styles.input, styles.notesInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]} placeholder="Notes (optional)" placeholderTextColor={theme.textLight} value={notes} onChangeText={setNotes} multiline />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => { setShowModal(false); setExercises([]); setNotes(''); setDuration(''); }}>
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.primary }]} onPress={saveWorkout}>
                  <Text style={styles.saveButtonText}>Save Workout</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  subtitle: { fontSize: 14, marginTop: 4 },
  addButton: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  workoutCard: { marginBottom: 12, borderRadius: 16, padding: 16 },
  workoutHeader: { flexDirection: 'row', alignItems: 'center' },
  workoutIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  workoutInfo: { flex: 1 },
  workoutType: { fontSize: 16, fontWeight: '600' },
  workoutMeta: { fontSize: 13, marginTop: 2 },
  exerciseList: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  exerciseItem: { fontSize: 13, marginBottom: 4 },
  moreExercises: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, borderRadius: 16, padding: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 4 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, maxHeight: '85%', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  typeScroll: { marginBottom: 16 },
  typeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  typeButtonText: { fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12 },
  exerciseInputRow: { flexDirection: 'row', gap: 8 },
  smallInput: { flex: 1 },
  addExerciseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 12, marginBottom: 16 },
  addExerciseText: { fontSize: 14, fontWeight: '600' },
  exercisesList: { marginBottom: 16 },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 6 },
  exerciseRowText: { fontSize: 14 },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelButton: { borderWidth: 1 },
  cancelButtonText: { fontWeight: '600' },
  saveButtonText: { color: '#fff', fontWeight: '600' },
});
