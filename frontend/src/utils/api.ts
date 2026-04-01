const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

let useLocalData = false;

const getToday = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

const makeId = () => Math.random().toString(36).slice(2, 10);

const createSampleState = () => ({
  habits: [
    { id: 'h1', name: 'Drink 8 glasses of water', category: 'health', icon: 'water', streak: 5, best_streak: 12, total_completions: 45 },
    { id: 'h2', name: 'Morning meditation', category: 'personal', icon: 'heart', streak: 3, best_streak: 7, total_completions: 28 },
    { id: 'h3', name: 'Read for 30 minutes', category: 'productivity', icon: 'book', streak: 7, best_streak: 14, total_completions: 62 },
  ],
  habitLogs: [],
  water: {
    [getToday()]: { date: getToday(), cups: 6, goal: 8, logs: [{ time: '09:00', cups: 2 }, { time: '14:00', cups: 2 }, { time: '18:00', cups: 2 }] },
  },
  nutrition: {
    [getToday()]: [
      { id: 'm1', date: getToday(), name: 'Oatmeal with berries', calories: 320, protein: 12, carbs: 45, fats: 8, meal_type: 'breakfast' },
      { id: 'm2', date: getToday(), name: 'Grilled chicken salad', calories: 450, protein: 35, carbs: 20, fats: 15, meal_type: 'lunch' },
      { id: 'm3', date: getToday(), name: 'Salmon & veggies', calories: 520, protein: 40, carbs: 25, fats: 22, meal_type: 'dinner' },
    ],
  },
  journal: [
    { id: 'j1', date: getToday(), tracker_type: 'journal', content: 'Today was great! I built the local data mode and all tabs run offline.', images: [], mood: '😄', tags: ['productivity', 'gratitude'], prompt: 'What made you feel good today?', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ],
  fitness: [
    { id: 'f1', date: getToday(), workout_type: 'Full Body', exercises: [{ name: 'Pushup', sets: 3, reps: 12, weight: 0 }], notes: 'Felt good', duration_minutes: 30, calories_burned: 250 },
  ],
  calendar: [
    { id: 'c1', date: getToday(), title: 'Team Meeting', time: '10:00', category: 'work', description: 'Weekly sync', is_recurring: false, recurrence_pattern: null },
    { id: 'c2', date: getToday(), title: 'Gym Session', time: '18:00', category: 'personal', description: 'Leg day', is_recurring: false, recurrence_pattern: null },
  ],
});

let sampleState = createSampleState();

const samplePrompt = (): string => {
  const prompts = [
    'What made you feel good today?',
    'What are you grateful for right now?',
    'Describe a moment that made you smile today.',
    'What would make tomorrow great?',
  ];
  return prompts[new Date().getDate() % prompts.length];
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export const api = {
  setLocalData: (value: boolean) => {
    useLocalData = value;
  },
  isLocalData: () => useLocalData,

  get: async (endpoint: string) => {
    if (useLocalData) {
      await new Promise((r) => setTimeout(r, 120));
      if (endpoint.startsWith('/dashboard/')) {
        const date = endpoint.split('/')[2] || getToday();
        const water = sampleState.water[date] || { cups: 0, goal: 8, logs: [] };
        const habitsCompleted = Math.min(3, sampleState.habits.length);
        return clone({
          date,
          habits: { completed: habitsCompleted, total: sampleState.habits.length, percentage: Math.round((habitsCompleted / sampleState.habits.length) * 100) },
          water: { cups: water.cups, goal: water.goal, percentage: Math.round((water.cups / water.goal) * 100) },
          nutrition: { calories: (sampleState.nutrition[date] || []).reduce((s, m) => s + m.calories, 0), goal: 2000, meals: (sampleState.nutrition[date] || []).length },
          mood: { mood_level: 8, emoji: '😊', notes: 'Feeling good', factors: ['work', 'exercise'] },
          fitness: { workouts_today: sampleState.fitness.filter((w) => w.date === date).length },
          laundry: { overdue_count: 0 },
          journal: { entries_today: sampleState.journal.filter((e) => e.date === date).length },
        });
      }

      if (endpoint === '/journal/prompt') {
        return clone({ prompt: samplePrompt(), date: getToday() });
      }

      if (endpoint === '/journal') {
        return clone({ entries: sampleState.journal, total: sampleState.journal.length, limit: 50, offset: 0 });
      }

      if (endpoint.startsWith('/journal/date/')) {
        const date = endpoint.split('/').pop() || getToday();
        return clone(sampleState.journal.filter((item) => item.date === date));
      }

      if (endpoint.startsWith('/fitness/history/')) {
        const days = parseInt(endpoint.split('/').pop() || '30', 10);
        return clone(sampleState.fitness.filter((item) => {
          const daysAgo = Math.round((new Date(getToday()).getTime() - new Date(item.date).getTime()) / (1000 * 60 * 60 * 24));
          return daysAgo < days;
        }));
      }

      if (endpoint.startsWith('/nutrition/')) {
        const date = endpoint.split('/').pop() || getToday();
        if (endpoint.includes('/nutrition/summary/')) {
          const meals = sampleState.nutrition[date] || [];
          return clone({ date, total_calories: meals.reduce((s, m) => s + m.calories, 0), total_protein: meals.reduce((s, m) => s + m.protein, 0), total_carbs: meals.reduce((s, m) => s + m.carbs, 0), total_fats: meals.reduce((s, m) => s + m.fats, 0), meal_count: meals.length, calorie_goal: 2000, meals: meals });
        }
        return clone(sampleState.nutrition[date] || []);
      }

      if (endpoint === '/calendar') {
        return clone(sampleState.calendar);
      }

      if (endpoint.startsWith('/calendar/date/')) {
        const date = endpoint.split('/').pop() || getToday();
        return clone(sampleState.calendar.filter((item) => item.date === date));
      }

      if (endpoint === '/habits') {
        return clone(sampleState.habits);
      }

      if (endpoint.startsWith('/water/')) {
        const date = endpoint.split('/').pop() || getToday();
        const water = sampleState.water[date] || { date, cups: 0, goal: 8, logs: [] };
        return clone(water);
      }

      throw new Error(`Local API route not implemented: ${endpoint}`);
    }

    const response = await fetch(`${API_URL}/api${endpoint}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return response.json();
  },

  post: async (endpoint: string, data?: any) => {
    if (useLocalData) {
      await new Promise((r) => setTimeout(r, 120));
      if (endpoint === '/seed') {
        sampleState = createSampleState();
        return clone({ message: 'Sample data loaded (local)' });
      }

      if (endpoint === '/journal') {
        const now = new Date().toISOString();
        const entry = { id: makeId(), date: data.date || getToday(), tracker_type: 'journal', content: data.content, images: data.images || [], mood: data.mood || null, tags: data.tags || [], prompt: data.prompt || samplePrompt(), created_at: now, updated_at: now };
        sampleState.journal.unshift(entry);
        return clone(entry);
      }

      if (endpoint === '/fitness') {
        const workout = { ...data, id: makeId(), date: data.date || getToday() };
        sampleState.fitness.unshift(workout);
        return clone(workout);
      }

      if (endpoint === '/nutrition') {
        const entry = { ...data, id: makeId(), date: data.date || getToday() };
        if (!sampleState.nutrition[entry.date]) sampleState.nutrition[entry.date] = [];
        sampleState.nutrition[entry.date].push(entry);
        return clone(entry);
      }

      if (endpoint.startsWith('/water/') && endpoint.includes('/add')) {
        const date = endpoint.split('/')[2];
        const cups = Number(new URLSearchParams(endpoint.split('?')[1] || '').get('cups') || 1);
        if (!sampleState.water[date]) sampleState.water[date] = { date, cups: 0, goal: 8, logs: [] };
        sampleState.water[date].cups += cups;
        sampleState.water[date].logs.push({ time: new Date().toTimeString().slice(0, 5), cups });
        return clone(sampleState.water[date]);
      }

      if (endpoint === '/mood') {
        return clone({ ...data, id: makeId() });
      }

      if (endpoint === '/calendar') {
        const event = { ...data, id: makeId() };
        sampleState.calendar.push(event);
        return clone(event);
      }

      if (endpoint === '/habit') {
        return clone({ ...data, id: makeId() });
      }

      throw new Error(`Local API route not implemented (POST): ${endpoint}`);
    }

    const response = await fetch(`${API_URL}/api${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    return response.json();
  },

  delete: async (endpoint: string) => {
    if (useLocalData) {
      await new Promise((r) => setTimeout(r, 120));
      if (endpoint.startsWith('/journal/')) {
        const id = endpoint.split('/').pop();
        sampleState.journal = sampleState.journal.filter((item) => item.id !== id);
        return { message: 'Entry deleted' };
      }
      if (endpoint.startsWith('/fitness/')) {
        const id = endpoint.split('/').pop();
        sampleState.fitness = sampleState.fitness.filter((item) => item.id !== id);
        return { message: 'Workout deleted' };
      }
      throw new Error(`Local API route not implemented (DELETE): ${endpoint}`);
    }

    const response = await fetch(`${API_URL}/api${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('API Error');
    return response.json();
  },
};

export { getToday };

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};
