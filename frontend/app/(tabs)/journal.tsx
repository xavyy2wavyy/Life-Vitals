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
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Shadows } from '../../src/utils/colors';
import { Card } from '../../src/components/Card';
import { api, getToday } from '../../src/utils/api';
import { JournalEntry, JournalEntriesResponse } from '../../src/types';

const MOOD_OPTIONS = ['😄', '🙂', '😐', '😔', '😡'];

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dailyPrompt, setDailyPrompt] = useState('');
  
  // Create entry form
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  const today = getToday();

  const fetchData = useCallback(async () => {
    try {
      const [entriesData, promptData] = await Promise.all([
        api.get('/journal'),
        api.get('/journal/prompt'),
      ]);
      setEntries(entriesData.entries || []);
      setDailyPrompt(promptData.prompt);
    } catch (error) {
      console.error('Error fetching journal:', error);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets
        .filter(asset => asset.base64)
        .map(asset => `data:image/jpeg;base64,${asset.base64}`);
      setImages([...images, ...newImages].slice(0, 5)); // Max 5 images
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const resetForm = () => {
    setContent('');
    setSelectedMood(null);
    setTags([]);
    setImages([]);
    setTagInput('');
  };

  const saveEntry = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please write something before saving.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/journal', {
        date: today,
        content: content.trim(),
        images,
        mood: selectedMood,
        tags,
        prompt: dailyPrompt,
      });
      setShowCreateModal(false);
      resetForm();
      await fetchData();
    } catch (error) {
      console.error('Error saving journal entry:', error);
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this journal entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/journal/${entryId}`);
            await fetchData();
          } catch (error) {
            console.error('Error deleting entry:', error);
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    
    const diffTime = todayDate.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== todayDate.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Journal</Text>
          <Text style={styles.subtitle}>Your thoughts, memories, and reflections</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Feed */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="book-outline" size={56} color={Colors.textLight} />
            <Text style={styles.emptyText}>No journal entries yet</Text>
            <Text style={styles.emptySubtext}>
              Start writing your thoughts and memories
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>New Entry</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          entries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              onLongPress={() => deleteEntry(entry.id)}
              activeOpacity={0.9}
            >
              <Card style={styles.entryCard}>
                {/* Entry Header */}
                <View style={styles.entryHeader}>
                  <View style={styles.entryDateContainer}>
                    <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                    <Text style={styles.entryTime}>{formatTime(entry.created_at)}</Text>
                  </View>
                  {entry.mood && (
                    <Text style={styles.entryMood}>{entry.mood}</Text>
                  )}
                </View>

                {/* Entry Content */}
                <Text style={styles.entryContent}>{entry.content}</Text>

                {/* Entry Images */}
                {entry.images && entry.images.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagesScroll}
                    contentContainerStyle={styles.imagesContainer}
                  >
                    {entry.images.map((image, index) => (
                      <Image
                        key={index}
                        source={{ uri: image }}
                        style={styles.entryImage}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                )}

                {/* Entry Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {entry.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="pencil" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create Entry Modal */}
      <Modal visible={showCreateModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboard}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={28} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Entry</Text>
              <TouchableOpacity 
                onPress={saveEntry}
                disabled={saving || !content.trim()}
                style={[
                  styles.saveHeaderButton,
                  (!content.trim() || saving) && styles.saveHeaderButtonDisabled
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveHeaderButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Daily Prompt */}
              <View style={styles.promptContainer}>
                <Ionicons name="bulb" size={20} color={Colors.primary} />
                <Text style={styles.promptText}>{dailyPrompt}</Text>
              </View>

              {/* Text Input */}
              <TextInput
                style={styles.contentInput}
                placeholder="Write your thoughts here..."
                placeholderTextColor={Colors.textLight}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
                autoFocus
              />

              {/* Selected Images Preview */}
              {images.length > 0 && (
                <View style={styles.selectedImagesContainer}>
                  <Text style={styles.sectionLabel}>Photos</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.selectedImagesScroll}
                  >
                    {images.map((image, index) => (
                      <View key={index} style={styles.selectedImageWrapper}>
                        <Image
                          source={{ uri: image }}
                          style={styles.selectedImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeImage(index)}
                        >
                          <Ionicons name="close-circle" size={24} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Mood Selector */}
              <View style={styles.moodSection}>
                <Text style={styles.sectionLabel}>How are you feeling?</Text>
                <View style={styles.moodRow}>
                  {MOOD_OPTIONS.map((mood) => (
                    <TouchableOpacity
                      key={mood}
                      style={[
                        styles.moodOption,
                        selectedMood === mood && styles.moodOptionSelected,
                      ]}
                      onPress={() => setSelectedMood(selectedMood === mood ? null : mood)}
                    >
                      <Text style={styles.moodEmoji}>{mood}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tags */}
              <View style={styles.tagsSection}>
                <Text style={styles.sectionLabel}>Tags</Text>
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={styles.tagInput}
                    placeholder="Add a tag..."
                    placeholderTextColor={Colors.textLight}
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={addTag}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
                    <Ionicons name="add" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                {tags.length > 0 && (
                  <View style={styles.selectedTags}>
                    {tags.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={styles.selectedTag}
                        onPress={() => removeTag(tag)}
                      >
                        <Text style={styles.selectedTagText}>#{tag}</Text>
                        <Ionicons name="close" size={14} color={Colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
                  <Ionicons name="camera" size={24} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>Add Photo</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Save Button */}
            <View style={styles.saveButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!content.trim() || saving) && styles.saveButtonDisabled,
                ]}
                onPress={saveEntry}
                disabled={saving || !content.trim()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={22} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Entry</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
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
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  entryCard: {
    marginBottom: 16,
    padding: 18,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryDateContainer: {
    gap: 2,
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  entryTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  entryMood: {
    fontSize: 24,
  },
  entryContent: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  imagesScroll: {
    marginTop: 12,
    marginHorizontal: -18,
  },
  imagesContainer: {
    paddingHorizontal: 18,
    gap: 10,
  },
  entryImage: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.large,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalKeyboard: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  saveHeaderButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveHeaderButtonDisabled: {
    backgroundColor: Colors.border,
  },
  saveHeaderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
  },
  promptContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryBg,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  promptText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  contentInput: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    minHeight: 150,
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
    ...Shadows.small,
  },
  selectedImagesContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  selectedImagesScroll: {
    gap: 10,
  },
  selectedImageWrapper: {
    position: 'relative',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  moodSection: {
    marginBottom: 20,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 16,
    ...Shadows.small,
  },
  moodOption: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 26,
    backgroundColor: Colors.background,
  },
  moodOptionSelected: {
    backgroundColor: Colors.primaryBg,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  moodEmoji: {
    fontSize: 26,
  },
  tagsSection: {
    marginBottom: 20,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tagInput: {
    flex: 1,
    fontSize: 15,
    padding: 14,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
  },
  addTagButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
  },
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectedTagText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  saveButtonContainer: {
    padding: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    ...Shadows.medium,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.border,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
