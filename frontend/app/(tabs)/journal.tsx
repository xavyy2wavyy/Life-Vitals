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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, getShadows } from '../../src/utils/theme';
import { Card } from '../../src/components/Card';
import { api, getToday } from '../../src/utils/api';
import { JournalEntry } from '../../src/types';

const MOOD_OPTIONS = ['😄', '🙂', '😐', '😔', '😡'];

export default function JournalScreen() {
  const { theme } = useTheme();
  const shadows = getShadows(theme);
  
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dailyPrompt, setDailyPrompt] = useState('');
  
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
      Alert.alert('Permission needed', 'Please grant camera roll permissions.');
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
      setImages([...images, ...newImages].slice(0, 5));
    }
  };

  const removeImage = (index: number) => setImages(images.filter((_, i) => i !== index));

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

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
      Alert.alert('Error', 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entryId: string) => {
    Alert.alert('Delete Entry', 'Are you sure?', [
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
    const diffDays = Math.floor((todayDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

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
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Journal</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Your thoughts, memories, and reflections</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }, shadows.medium]} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card }, shadows.small]}>
            <Ionicons name="book-outline" size={56} color={theme.textLight} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No journal entries yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Start writing your thoughts</Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: theme.primary }]} onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>New Entry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          entries.map((entry) => (
            <TouchableOpacity key={entry.id} onLongPress={() => deleteEntry(entry.id)} activeOpacity={0.9}>
              <View style={[styles.entryCard, { backgroundColor: theme.card }, shadows.small]}>
                <View style={styles.entryHeader}>
                  <View>
                    <Text style={[styles.entryDate, { color: theme.text }]}>{formatDate(entry.date)}</Text>
                    <Text style={[styles.entryTime, { color: theme.textLight }]}>{formatTime(entry.created_at)}</Text>
                  </View>
                  {entry.mood && <Text style={styles.entryMood}>{entry.mood}</Text>}
                </View>
                <Text style={[styles.entryContent, { color: theme.text }]}>{entry.content}</Text>
                {entry.images && entry.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                    {entry.images.map((image, index) => (
                      <Image key={index} source={{ uri: image }} style={[styles.entryImage, { backgroundColor: theme.border }]} resizeMode="cover" />
                    ))}
                  </ScrollView>
                )}
                {entry.tags && entry.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {entry.tags.map((tag, index) => (
                      <View key={index} style={[styles.tag, { backgroundColor: theme.primaryBg }]}>
                        <Text style={[styles.tagText, { color: theme.primary }]}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }, shadows.large]} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="pencil" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showCreateModal} animationType="slide">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKeyboard}>
            <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}>
                <Ionicons name="close" size={28} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Entry</Text>
              <TouchableOpacity
                onPress={saveEntry}
                disabled={saving || !content.trim()}
                style={[styles.saveHeaderButton, { backgroundColor: content.trim() && !saving ? theme.primary : theme.border }]}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveHeaderButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={[styles.promptContainer, { backgroundColor: theme.primaryBg }]}>
                <Ionicons name="bulb" size={20} color={theme.primary} />
                <Text style={[styles.promptText, { color: theme.primary }]}>{dailyPrompt}</Text>
              </View>

              <TextInput
                style={[styles.contentInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                placeholder="Write your thoughts here..."
                placeholderTextColor={theme.textLight}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />

              {images.length > 0 && (
                <View style={styles.selectedImagesContainer}>
                  <Text style={[styles.sectionLabel, { color: theme.text }]}>Photos</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {images.map((image, index) => (
                      <View key={index} style={styles.selectedImageWrapper}>
                        <Image source={{ uri: image }} style={[styles.selectedImage, { backgroundColor: theme.border }]} resizeMode="cover" />
                        <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                          <Ionicons name="close-circle" size={24} color={theme.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.moodSection}>
                <Text style={[styles.sectionLabel, { color: theme.text }]}>How are you feeling?</Text>
                <View style={[styles.moodRow, { backgroundColor: theme.card }, shadows.small]}>
                  {MOOD_OPTIONS.map((mood) => (
                    <TouchableOpacity
                      key={mood}
                      style={[styles.moodOption, { backgroundColor: theme.background }, selectedMood === mood && { backgroundColor: theme.primaryBg, borderWidth: 2, borderColor: theme.primary }]}
                      onPress={() => setSelectedMood(selectedMood === mood ? null : mood)}
                    >
                      <Text style={styles.moodEmoji}>{mood}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.tagsSection}>
                <Text style={[styles.sectionLabel, { color: theme.text }]}>Tags</Text>
                <View style={styles.tagInputRow}>
                  <TextInput
                    style={[styles.tagInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                    placeholder="Add a tag..."
                    placeholderTextColor={theme.textLight}
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={addTag}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={[styles.addTagButton, { backgroundColor: theme.primaryBg }]} onPress={addTag}>
                    <Ionicons name="add" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>
                {tags.length > 0 && (
                  <View style={styles.selectedTags}>
                    {tags.map((tag) => (
                      <TouchableOpacity key={tag} style={[styles.selectedTag, { backgroundColor: theme.primaryBg }]} onPress={() => removeTag(tag)}>
                        <Text style={[styles.selectedTagText, { color: theme.primary }]}>#{tag}</Text>
                        <Ionicons name="close" size={14} color={theme.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={pickImage}>
                <Ionicons name="camera" size={24} color={theme.primary} />
                <Text style={[styles.actionButtonText, { color: theme.text }]}>Add Photo</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={[styles.saveButtonContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: content.trim() && !saving ? theme.primary : theme.border }, shadows.medium]}
                onPress={saveEntry}
                disabled={saving || !content.trim()}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : (
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4 },
  addButton: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 8, paddingBottom: 100 },
  emptyCard: { alignItems: 'center', paddingVertical: 48, marginTop: 20, borderRadius: 16, padding: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 20 },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 24 },
  emptyButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  entryCard: { marginBottom: 16, padding: 18, borderRadius: 16 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  entryDate: { fontSize: 15, fontWeight: '600' },
  entryTime: { fontSize: 12, marginTop: 2 },
  entryMood: { fontSize: 24 },
  entryContent: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  imagesScroll: { marginTop: 12, marginHorizontal: -18, paddingHorizontal: 18 },
  entryImage: { width: 160, height: 160, borderRadius: 12, marginRight: 10 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 12, fontWeight: '500' },
  fab: { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  modalContainer: { flex: 1 },
  modalKeyboard: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  saveHeaderButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, minWidth: 60, alignItems: 'center' },
  saveHeaderButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  modalScroll: { flex: 1 },
  modalScrollContent: { padding: 20 },
  promptContainer: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, marginBottom: 20 },
  promptText: { flex: 1, fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  contentInput: { fontSize: 16, lineHeight: 24, minHeight: 150, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  selectedImagesContainer: { marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  selectedImageWrapper: { position: 'relative', marginRight: 10 },
  selectedImage: { width: 100, height: 100, borderRadius: 12 },
  removeImageButton: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12 },
  moodSection: { marginBottom: 20 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 16 },
  moodOption: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 26 },
  moodEmoji: { fontSize: 26 },
  tagsSection: { marginBottom: 20 },
  tagInputRow: { flexDirection: 'row', gap: 10 },
  tagInput: { flex: 1, fontSize: 15, padding: 14, borderRadius: 12, borderWidth: 1 },
  addTagButton: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  selectedTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  selectedTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  selectedTagText: { fontSize: 13, fontWeight: '500' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  actionButtonText: { fontSize: 14, fontWeight: '500' },
  saveButtonContainer: { padding: 20, paddingTop: 12, borderTopWidth: 1 },
  saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
