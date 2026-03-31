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

export interface WaterLog {
  time: string;
  cups: number;
}

export interface WaterEntry {
  id: string;
  date: string;
  cups: number;
  goal: number;
  logs: WaterLog[];
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

export interface LaundryHistory {
  date: string;
  notes?: string;
  timestamp?: string;
}

export interface LaundryEntry {
  id: string;
  category: 'clothes' | 'bedding' | 'gym_clothes' | string;
  last_done: string;
  frequency_days: number;
  notes?: string;
  history: LaundryHistory[];
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

export interface JournalEntry {
  id: string;
  date: string;
  tracker_type: string;
  content: string;
  images: string[];
  mood?: string;
  tags: string[];
  prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntriesResponse {
  entries: JournalEntry[];
  total: number;
  limit: number;
  offset: number;
}
