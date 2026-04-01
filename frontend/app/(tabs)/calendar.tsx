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
import { Colors } from '../../src/utils/colors';
import { useTheme, getShadows } from '../../src/utils/theme';
import { Card } from '../../src/components/Card';
import { api, getToday } from '../../src/utils/api';
import { CalendarEvent, MoodEntry } from '../../src/types';

const CATEGORY_COLORS = {
  work: '#FF6B6B',
  school: '#4ECDC4',
  personal: '#45B7D1',
  vanity: '#FFA07A',
};

const CATEGORIES = [
  { key: 'work', label: 'Work', icon: 'briefcase' },
  { key: 'school', label: 'School', icon: 'school' },
  { key: 'personal', label: 'Personal', icon: 'person' },
  { key: 'vanity', label: 'Vanity', icon: 'sparkles' },
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const { theme } = useTheme();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventCategory, setEventCategory] = useState<string>('personal');
  const [eventDescription, setEventDescription] = useState('');

  const getMonthKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const fetchData = useCallback(async () => {
    try {
      const monthKey = getMonthKey(currentMonth);
      const [eventsData, moodData] = await Promise.all([
        api.get(`/calendar/${monthKey}`),
        api.get('/mood/history/30'),
      ]);
      setEvents(eventsData);
      setMoodHistory(moodData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const saveEvent = async () => {
    if (!eventTitle) {
      Alert.alert('Error', 'Please enter event title');
      return;
    }
    try {
      await api.post('/calendar', {
        title: eventTitle,
        date: selectedDate,
        time: eventTime || null,
        category: eventCategory,
        description: eventDescription || null,
      });
      setShowModal(false);
      resetEventForm();
      await fetchData();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventTime('');
    setEventCategory('personal');
    setEventDescription('');
  };

  const deleteEvent = async (eventId: string) => {
    Alert.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/calendar/${eventId}`);
            await fetchData();
          } catch (error) {
            console.error('Error deleting event:', error);
          }
        },
      },
    ]);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentMonth(newDate);
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    const days: (number | null)[] = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const formatDateKey = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getEventsForDay = (day: number) => {
    const dateKey = formatDateKey(day);
    return events.filter(e => e.date === dateKey);
  };

  const getMoodForDay = (day: number) => {
    const dateKey = formatDateKey(day);
    return moodHistory.find(m => m.date === dateKey);
  };

  const getCategoryInfo = (category: string) => {
    const cat = CATEGORIES.find(c => c.key === category) || CATEGORIES[2];
    return { ...cat, color: CATEGORY_COLORS[cat.key as keyof typeof CATEGORY_COLORS] };
  };

  const selectedDateEvents = events.filter(e => e.date === selectedDate);
  const today = getToday();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Month Header */}
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <Card style={[styles.calendarCard, { backgroundColor: theme.card }]}>
          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={[styles.weekdayText, { color: theme.textSecondary }]}>{day}</Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {generateCalendarDays().map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }
              
              const dateKey = formatDateKey(day);
              const dayEvents = getEventsForDay(day);
              const dayMood = getMoodForDay(day);
              const isToday = dateKey === today;
              const isSelected = dateKey === selectedDate;
              
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    isToday && [styles.todayCell, { backgroundColor: theme.primaryBg }],
                    isSelected && [styles.selectedCell, { backgroundColor: theme.primary }],
                  ]}
                  onPress={() => setSelectedDate(dateKey)}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      { color: theme.text },
                      isToday && [styles.todayNumber, { color: theme.primary }],
                      isSelected && styles.selectedNumber,
                    ]}
                  >
                    {day}
                  </Text>
                  <View style={styles.dayIndicators}>
                    {dayEvents.length > 0 && (
                      <View
                        style={[
                          styles.eventDot,
                          { backgroundColor: getCategoryInfo(dayEvents[0].category).color },
                        ]}
                      />
                    )}
                    {dayMood && (
                      <Text style={styles.miniMood}>{dayMood.emoji}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Selected Date Events */}
        <View style={styles.eventsSection}>
          <View style={styles.eventsSectionHeader}>
            <Text style={[styles.eventsSectionTitle, { color: theme.text }]}>
              {selectedDate === today ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              style={[styles.addEventButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {selectedDateEvents.length > 0 ? (
            selectedDateEvents.map((event) => {
              const categoryInfo = getCategoryInfo(event.category);
              return (
                <TouchableOpacity
                  key={event.id}
                  onLongPress={() => deleteEvent(event.id)}
                >
                  <Card style={[styles.eventCard, { backgroundColor: theme.card }]}>
                    <View style={[styles.eventAccent, { backgroundColor: categoryInfo.color }]} />
                    <View style={styles.eventContent}>
                      <Text style={[styles.eventTitle, { color: theme.text }]}>{event.title}</Text>
                      <View style={styles.eventMeta}>
                        <View style={styles.eventMetaItem}>
                          <Ionicons name={categoryInfo.icon as any} size={14} color={categoryInfo.color} />
                          <Text style={[styles.eventMetaText, { color: categoryInfo.color }]}>
                            {categoryInfo.label}
                          </Text>
                        </View>
                        {event.time && (
                          <View style={styles.eventMetaItem}>
                            <Ionicons name="time" size={14} color={theme.textSecondary} />
                            <Text style={[styles.eventMetaText, { color: theme.textSecondary }]}>{event.time}</Text>
                          </View>
                        )}
                      </View>
                      {event.description && (
                        <Text style={[styles.eventDescription, { color: theme.textSecondary }]}>{event.description}</Text>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
          ) : (
            <Card style={[styles.noEventsCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.noEventsText, { color: theme.textSecondary }]}>No events for this day</Text>
              <Text style={[styles.noEventsSubtext, { color: theme.textLight }]}>Tap + to add an event</Text>
            </Card>
          )}
        </View>

        {/* Category Legend */}
        <View style={styles.legendSection}>
          <Text style={[styles.legendTitle, { color: theme.textSecondary }]}>Categories</Text>
          <View style={styles.legendGrid}>
            {CATEGORIES.map((cat) => {
              const categoryInfo = getCategoryInfo(cat.key);
              return (
                <View key={cat.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: categoryInfo.color }]} />
                  <Text style={[styles.legendText, { color: theme.text }]}>{cat.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Event 📅</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Event title"
              placeholderTextColor={theme.textLight}
              value={eventTitle}
              onChangeText={setEventTitle}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Time (e.g., 14:00)"
              placeholderTextColor={theme.textLight}
              value={eventTime}
              onChangeText={setEventTime}
            />
            
            <Text style={[styles.inputLabel, { color: theme.text }]}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => {
                const categoryInfo = getCategoryInfo(cat.key);
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryOption,
                      { borderColor: theme.border },
                      eventCategory === cat.key && {
                        backgroundColor: categoryInfo.color,
                        borderColor: categoryInfo.color,
                      },
                    ]}
                    onPress={() => setEventCategory(cat.key)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={eventCategory === cat.key ? '#fff' : categoryInfo.color}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TextInput
              style={[styles.input, styles.descriptionInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.textLight}
              value={eventDescription}
              onChangeText={setEventDescription}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                onPress={() => {
                  setShowModal(false);
                  resetEventForm();
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={saveEvent}
              >
                <Text style={styles.saveButtonText}>Save</Text>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  calendarCard: {
    marginBottom: 20,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  todayCell: {
    borderRadius: 12,
  },
  selectedCell: {
    borderRadius: 12,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  todayNumber: {
    fontWeight: '700',
  },
  selectedNumber: {
    color: '#fff',
    fontWeight: '700',
  },
  dayIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 14,
    gap: 2,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  miniMood: {
    fontSize: 8,
  },
  eventsSection: {
    marginBottom: 20,
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addEventButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCard: {
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
  },
  eventAccent: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 12,
  },
  eventDescription: {
    fontSize: 13,
    marginTop: 6,
  },
  noEventsCard: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noEventsText: {
    fontSize: 14,
  },
  noEventsSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  legendSection: {
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
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
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  categoryOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  descriptionInput: {
    minHeight: 80,
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
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  saveButton: {},
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
