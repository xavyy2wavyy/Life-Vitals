export interface Habit {
  id: string;
  name: string;
  category: 'health' | 'personal' | 'productivity';
  icon: string;
  streak: number;
  created_at: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
}

export interface MoodEntry {
  id: string;
  date: string;
  mood_level: number;
  emoji: string;
  notes?: string;
}

export interface WaterEntry {
  id: string;
  date: string;
  cups: number;
  goal: number;
}

export interface MealEntry {
  id: string;
  date: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface WorkoutEntry {
  id: string;
  date: string;
  workout_type: string;
  exercises: Exercise[];
  notes?: string;
  duration_minutes?: number;
}

export interface LaundryEntry {
  id: string;
  category: 'clothes' | 'bedding' | 'gym_clothes';
  last_done: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: 'work' | 'school' | 'personal' | 'vanity';
  description?: string;
}

export interface DashboardSummary {
  date: string;
  habits: {
    completed: number;
    total: number;
    percentage: number;
  };
  water: {
    cups: number;
    goal: number;
    percentage: number;
  };
  nutrition: {
    calories: number;
    goal: number;
    meals: number;
  };
  mood: MoodEntry | null;
  fitness: {
    workouts_today: number;
  };
}
