import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, Text, TouchableOpacity,
  Alert, ActivityIndicator, Modal, Animated, Keyboard, KeyboardAvoidingView,
  Platform, Switch, TextInput, ScrollView, Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { 
  Bell, Plus, CalendarDays, Clock, Trash2, BellOff, ChevronRight, X, 
  Repeat, Music, Volume2, VolumeX, FolderMusic, Check, AlertCircle 
} from 'lucide-react-native';
import { getReminders, createReminder, updateReminder, deleteReminder } from '../../api/reminders';
import { getSubjects } from '../../api/subjects';
import { DrawerActions } from '@react-navigation/native';
import {
  scheduleAlarm,
  cancelAlarm,
  playAudioPreview,
  stopAudioPreview,
} from '../../services/AlarmModule';
import { setupNotifications } from '../../services/NotificationService';
import { getNextTriggerTimestamp, validateReminderDateTime } from '../../utils/reminderHelper';
import {
  getNotifId,
  setNotifId,
  removeNotifId,
  getAllNotifIds,
} from '../../services/NotificationStore';
import { Header } from '../../components/ui/Header';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { WeekdaySelector } from '../../components/ui/WeekdaySelector';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/theme';

const CATEGORY_OPTIONS = [
  { label: 'General', value: 'general' },
  { label: 'Study', value: 'study' },
  { label: 'Exam', value: 'exam' },
  { label: 'Assignment', value: 'assignment' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (date) => {
  return new Date(date).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const isUpcoming = (remindAt) => new Date(remindAt) > new Date();
const isToday = (remindAt) => {
  const d = new Date(remindAt);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};

// ─── Component ────────────────────────────────────────────────────────────────

const RemindersScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii, isDark } = useAppTheme();

  // List state
  const [reminders, setReminders] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(null);

  // Bottom sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [editingNotifId, setEditingNotifId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');
  const [subjectId, setSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Recurrence & Audio State
  const [scheduleType, setScheduleType] = useState('one-time');
  const [weekdays, setWeekdays] = useState([]);
  const [soundId, setSoundId] = useState('default');
  const [soundUri, setSoundUri] = useState(null);
  const [soundName, setSoundName] = useState('');
  const [previewingSound, setPreviewingSound] = useState(null);

  // Date/time picker visibility (Android shows inline picker on press)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ─── Data Loading ────────────────────────────────────────────────────────────

  const loadReminders = useCallback(async (isRefresh = false) => {
    try {
      setError(null);
      const [remRes, subsRes] = await Promise.all([getReminders(), getSubjects()]);
      const data = (remRes.data || remRes || []);
      const subsData = (subsRes.data || subsRes || []);
      // Sort by remindAt ascending
      const sorted = [...data].sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));
      setReminders(sorted);
      setSubjects(subsData);
    } catch (e) {
      const msg = e?.response?.status === 401
        ? 'Session expired. Please log in again.'
        : 'Failed to load reminders.';
      setError(msg);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setupNotifications().then(hasPerm => {
      setNotificationPermission(hasPerm);
    });
    loadReminders();
    return () => {
      stopAudioPreview();
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReminders(true);
  }, [loadReminders]);

  // ─── Bottom Sheet ─────────────────────────────────────────────────────

  const openSheet = async (reminder = null) => {
    try {
      if (typeof navigation.closeDrawer === 'function') {
        navigation.closeDrawer();
      } else if (typeof navigation.getParent === 'function') {
        const parent = navigation.getParent('AppDrawer') || navigation.getParent();
        if (parent && typeof parent.closeDrawer === 'function') {
          parent.closeDrawer();
        }
      }
    } catch (e) {
      // Ignore if not rendered inside a drawer
    }
    await stopAudioPreview();
    setPreviewingSound(null);

    const now = new Date();
    if (reminder) {
      const storedNotifId = await getNotifId(reminder._id);
      setEditingId(reminder._id);
      setEditingNotifId(storedNotifId);
      setTitle(reminder.title || '');
      setDescription(reminder.description || '');
      setCategory(reminder.category || 'general');
      setPriority(reminder.priority || 'medium');
      setSubjectId(reminder.subject?._id || reminder.subject || '');
      const remindDate = new Date(reminder.remindAt);
      setSelectedDate(remindDate);
      setSelectedTime(remindDate);
      setNotificationEnabled(reminder.notificationEnabled !== false);
      setScheduleType(reminder.scheduleType || 'one-time');
      setWeekdays(reminder.weekdays || []);
      setSoundId(reminder.soundId || (reminder.soundPreference === 'local' ? 'custom' : 'default'));
      setSoundUri(reminder.soundUri || null);
      setSoundName(reminder.soundName || '');
    } else {
      // Default new reminder time: 15 minutes in the future
      const futureDefault = new Date(now.getTime() + 15 * 60 * 1000);
      setEditingId(null);
      setEditingNotifId(null);
      setTitle('');
      setDescription('');
      setCategory('general');
      setPriority('medium');
      setSubjectId('');
      setSelectedDate(futureDefault);
      setSelectedTime(futureDefault);
      setNotificationEnabled(true);
      setScheduleType('one-time');
      setWeekdays([]);
      setSoundId('default');
      setSoundUri(null);
      setSoundName('');
    }
    setFormError(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setSheetVisible(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeSheet = async () => {
    Keyboard.dismiss();
    await stopAudioPreview();
    setPreviewingSound(null);
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setSheetVisible(false);
      setSubmitting(false);
    });
  };

  // ─── Custom Audio Pick & Preview ──────────────────────────────────────────────

  const handlePickCustomAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'application/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];

      // Copy permanently to internal app storage
      const soundsDir = `${FileSystem.documentDirectory}custom_sounds/`;
      const dirInfo = await FileSystem.getInfoAsync(soundsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(soundsDir, { intermediates: true });
      }

      const safeName = `${Date.now()}_${(asset.name || 'custom_sound.mp3').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const destinationUri = `${soundsDir}${safeName}`;

      await FileSystem.copyAsync({
        from: asset.uri,
        to: destinationUri,
      });

      setSoundId('custom');
      setSoundName(asset.name || 'Custom Audio');
      setSoundUri(destinationUri);
    } catch (e) {
      console.warn('Error selecting audio file:', e);
      Alert.alert('Audio Picker', 'Could not access the selected audio file. Please try another file.');
    }
  };

  const handleTogglePreview = async (optValue, customUri = null) => {
    if (previewingSound === optValue) {
      await stopAudioPreview();
      setPreviewingSound(null);
    } else {
      await stopAudioPreview();
      setPreviewingSound(optValue);
      const targetUri = customUri || (optValue === 'custom' ? soundUri : null);
      await playAudioPreview(optValue, targetUri);
    }
  };

  // ─── Validation ───────────────────────────────────────────────────────────────

  const buildRemindAt = () => {
    const combined = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0,
    );
    return combined;
  };

  const validate = () => {
    if (!title.trim()) {
      setFormError('Please enter a reminder title.');
      return false;
    }
    // Perform robust live date/time validation using real-time moment
    const valResult = validateReminderDateTime(selectedDate, selectedTime, scheduleType, weekdays);
    if (!valResult.isValid) {
      setFormError(valResult.error);
      return false;
    }
    setFormError(null);
    return true;
  };

  // ─── Create / Edit ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    if (submitting) return;

    if (notificationEnabled && !notificationPermission) {
      Alert.alert(
        'Notification Permission Required',
        'StudyArena needs notification permission to remind you at the scheduled time. Please enable it in your device Settings.',
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);
    await stopAudioPreview();
    setPreviewingSound(null);

    const remindAt = buildRemindAt();
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      subject: subjectId || undefined,
      remindAt: remindAt.toISOString(),
      notificationEnabled,
      scheduleType,
      weekdays,
      repeatDayOfMonth: remindAt.getDate(),
      soundId,
      soundName: soundId === 'custom' ? soundName : undefined,
      soundUri: soundId === 'custom' ? soundUri : undefined,
      soundPreference: soundId === 'custom' ? 'local' : 'default',
    };

    try {
      if (editingId) {
        // ── EDIT ─────────────────────────────────────────────────────────────
        const res = await updateReminder(editingId, payload);
        const updated = res.data || res;

        // Cancel old native alarm
        await cancelAlarm(editingId);

        // Schedule new native alarm only if enabled and next trigger is strictly in future
        if (notificationEnabled) {
          const nextTimestamp = getNextTriggerTimestamp(updated);
          if (nextTimestamp && nextTimestamp > Date.now()) {
            console.log(`[REMINDER] Scheduling edited reminder: "${updated.title}" at ${new Date(nextTimestamp).toISOString()}`);
            await scheduleAlarm(
              editingId,
              nextTimestamp,
              updated.title,
              updated.soundId || 'default',
              updated.soundUri || soundUri || null
            );
          }
        }

        setReminders(prev => {
          const next = prev.map(r =>
            r._id === editingId ? { ...r, ...updated, soundName: payload.soundName, soundUri: payload.soundUri } : r
          );
          return [...next].sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));
        });

      } else {
        // ── CREATE ────────────────────────────────────────────────────────────
        const res = await createReminder(payload);
        const created = res.data || res;

        // Schedule notification only after successful backend creation and strictly in future
        if (notificationEnabled) {
          const nextTimestamp = getNextTriggerTimestamp(created);
          if (nextTimestamp && nextTimestamp > Date.now()) {
            console.log(`[REMINDER] Scheduling new reminder: "${created.title}" at ${new Date(nextTimestamp).toISOString()}`);
            await scheduleAlarm(
              created._id,
              nextTimestamp,
              created.title,
              created.soundId || 'default',
              created.soundUri || soundUri || null
            );
          }
        }

        setReminders(prev => {
          const next = [{ ...created, soundName: payload.soundName, soundUri: payload.soundUri }, ...prev];
          return next.sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));
        });
      }

      closeSheet();
    } catch (e) {
      const status = e?.response?.status;
      const serverMsg = e?.response?.data?.message;
      let userMsg = 'Could not save the reminder. Please try again.';
      if (status === 400) userMsg = serverMsg || 'Invalid reminder data.';
      else if (status === 401) userMsg = 'Session expired. Please log in again.';
      else if (status === 404) userMsg = 'Reminder not found.';
      else if (status >= 500) userMsg = 'Server error. Please try again later.';
      else if (!e?.response) userMsg = 'Network error. Check your connection.';
      setFormError(userMsg);
      setSubmitting(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = (reminder) => {
    Alert.alert(
      'Delete Reminder',
      `Delete "${reminder.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await deleteReminder(reminder._id);
              // Cancel scheduled native alarm
              await cancelAlarm(reminder._id);
              await removeNotifId(reminder._id);
              setReminders(prev => prev.filter(r => r._id !== reminder._id));
            } catch (e) {
              Alert.alert('Error', 'Failed to delete the reminder. Please try again.');
            }
          },
        },
      ],
    );
  };

  // ─── Date/Time Handlers ───────────────────────────────────────────────────────

  const onDateChange = (event, date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && date) {
      setSelectedDate(date);
      const val = validateReminderDateTime(date, selectedTime, scheduleType, weekdays);
      if (val.isValid) {
        setFormError(null);
      }
    }
  };

  const onTimeChange = (event, time) => {
    setShowTimePicker(false);
    if (event.type === 'set' && time) {
      setSelectedTime(time);
      const val = validateReminderDateTime(selectedDate, time, scheduleType, weekdays);
      if (val.isValid) {
        setFormError(null);
      }
    }
  };

  const handleAudioSelect = (id) => {
    setSoundId(id);
  };

  // ─── Render Helpers ───────────────────────────────────────────────────────────

  const getReminderStatus = (reminder) => {
    const isRecurring = reminder.scheduleType && reminder.scheduleType !== 'one-time';
    if (isRecurring) return { label: 'Recurring', color: colors.primary };
    if (!isUpcoming(reminder.remindAt)) return { label: 'Past', color: colors.mutedForeground };
    if (isToday(reminder.remindAt)) return { label: 'Today', color: colors.accent };
    return { label: 'Upcoming', color: colors.primary };
  };

  const styles = React.useMemo(
    () => makeStyles(colors, typography, spacing, radii, insets, isDark),
    [colors, typography, spacing, radii, insets, isDark]
  );

  // ─── Render: Reminder Card ────────────────────────────────────────────────────

  const renderItem = ({ item }) => {
    const status = getReminderStatus(item);
    const isRecurring = item.scheduleType && item.scheduleType !== 'one-time';
    const isPast = !isRecurring && !isUpcoming(item.remindAt);

    return (
      <View style={[styles.card, isPast && styles.cardPast]}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, isPast && styles.textPast]} numberOfLines={1}>
                {item.title}
              </Text>
              {!!item.description && (
                <Text style={[styles.cardDescription, isPast && styles.textPast]} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionIcon}
              onPress={() => openSheet(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronRight size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionIcon, styles.deleteIcon]}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={16} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaChip}>
            <CalendarDays size={12} color={colors.mutedForeground} />
            <Text style={styles.metaText}>{formatDate(item.remindAt)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Clock size={12} color={colors.mutedForeground} />
            <Text style={styles.metaText}>{formatTime(item.remindAt)}</Text>
          </View>
          {item.notificationEnabled === false && (
            <View style={styles.metaChip}>
              <BellOff size={12} color={colors.mutedForeground} />
              <Text style={styles.metaText}>Silent</Text>
            </View>
          )}
          {item.scheduleType && item.scheduleType !== 'one-time' && (
            <View style={[styles.metaChip, { backgroundColor: colors.primary + '18' }]}>
              <Repeat size={12} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>
                {item.scheduleType.charAt(0).toUpperCase() + item.scheduleType.slice(1)}
              </Text>
            </View>
          )}
          {item.soundId && item.soundId !== 'default' && (
            <View style={styles.metaChip}>
              <Music size={12} color={colors.mutedForeground} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.soundId === 'custom' ? (item.soundName || 'Custom Audio') :
                 item.soundId === 'default_alarm' ? 'Default Alarm' : 
                 item.soundId === 'gentle_alarm' ? 'Gentle Alarm' : 
                 item.soundId === 'study_bell' ? 'Study Bell' : 'Alarm'}
              </Text>
            </View>
          )}
          <View style={[styles.statusChip, { backgroundColor: status.color + '22' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </View>
    );
  };

  // ─── Render: Sheet Overlay ────────────────────────────────────────────────────

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const sheetOpacity = sheetAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.4, 1],
  });

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.screen}>
        <Header />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header />

      {notificationPermission === false && (
        <View style={styles.permBanner}>
          <BellOff size={14} color={colors.destructive} />
          <Text style={styles.permBannerText}>
            Notification permission denied. Reminders won't trigger alerts.
          </Text>
        </View>
      )}

      <FlatList
        data={reminders}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.eyebrow}>Time and attention</Text>
              <Text style={styles.screenTitle}>Reminders</Text>
              <Text style={styles.screenDetail}>Set the intent, we'll handle the timing.</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={() => openSheet()} activeOpacity={0.8}>
              <Plus size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          !error ? (
            <EmptyState
              title="No reminders scheduled"
              detail="Plan your next study session and we'll remind you when it's time."
              icon={Bell}
              action={
                <Button onPress={() => openSheet()}>
                  <Plus size={16} color={colors.primaryForeground} />
                  {' '}Create reminder
                </Button>
              }
            />
          ) : (
            <View style={styles.errorState}>
              <Text style={styles.errorText}>{error}</Text>
              <Button variant="outline" onPress={() => loadReminders()}>Retry</Button>
            </View>
          )
        }
      />

      {/* ─── Bottom Sheet Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={sheetVisible}
        animationType="none"
        transparent
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetWrapper}
        >
          {/* Backdrop */}
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.sheetBackdrop, { opacity: sheetOpacity }]} />
          </Pressable>

          {/* Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            {/* Drag handle */}
            <View style={styles.sheetHandle} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingId ? 'Edit Reminder' : 'Schedule Reminder'}</Text>
              <TouchableOpacity onPress={closeSheet} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
            >
              {/* Title */}
              <Text style={styles.fieldLabel}>Reminder title</Text>
              <TextInput
                style={[styles.input, formError && !title.trim() && styles.inputError]}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter reminder title"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="next"
                autoFocus
              />

              {/* Description */}
              <Text style={styles.fieldLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add reminder details"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              {/* Subject (Optional) */}
              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Link to Subject (optional)</Text>
              <SelectPicker
                value={subjectId}
                onValueChange={setSubjectId}
                options={[
                  { label: 'No specific subject', value: '' },
                  ...subjects.map((s) => ({
                    label: `${s.name} (${s.code})`,
                    value: s._id || s.id,
                  })),
                ]}
                placeholder="None"
              />

              {/* Category & Priority Row */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <SelectPicker
                    value={category}
                    onValueChange={setCategory}
                    options={CATEGORY_OPTIONS}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Priority</Text>
                  <SelectPicker
                    value={priority}
                    onValueChange={setPriority}
                    options={PRIORITY_OPTIONS}
                  />
                </View>
              </View>

              {/* When Section */}
              <Text style={[styles.fieldLabel, { marginTop: 8 }]}>When</Text>

              {/* Date Picker Trigger */}
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <CalendarDays size={18} color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={styles.pickerText}>{formatDate(selectedDate)}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={onDateChange}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              )}

              {/* Time Picker Trigger */}
              <TouchableOpacity
                style={[styles.pickerRow, !!formError && styles.inputError]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Clock size={18} color={colors.primary} style={{ marginRight: 10 }} />
                <Text style={styles.pickerText}>{formatTime(selectedTime)}</Text>
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                  themeVariant={isDark ? 'dark' : 'light'}
                />
              )}

              {/* Inline Date/Time Error Box */}
              {!!formError && (
                <View style={styles.inlineErrorBox}>
                  <AlertCircle size={14} color={colors.destructive} style={{ marginRight: 6 }} />
                  <Text style={styles.inlineErrorText}>{formError}</Text>
                </View>
              )}

              {/* ── Repeat / Recurrence ──────────────────────────────────────── */}
              <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Repeat</Text>
              <View style={styles.recurrenceRow}>
                {[
                  { value: 'one-time', label: 'None' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'yearly', label: 'Yearly' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.recurrenceChip,
                      scheduleType === opt.value && styles.recurrenceChipActive,
                    ]}
                    onPress={() => setScheduleType(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.recurrenceChipText,
                        scheduleType === opt.value && styles.recurrenceChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Weekday selector for weekly */}
              {scheduleType === 'weekly' && (
                <View style={styles.weekdayRow}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.weekdayBtn,
                        weekdays.includes(idx) && styles.weekdayBtnActive,
                      ]}
                      onPress={() => {
                        setWeekdays(prev =>
                          prev.includes(idx)
                            ? prev.filter(d => d !== idx)
                            : [...prev, idx]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.weekdayText,
                          weekdays.includes(idx) && styles.weekdayTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── Notification Sound ───────────────────────────────────────── */}
              <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Notification Sound</Text>
              <View style={styles.recurrenceRow}>
                {[
                  { value: 'default', label: 'System Default' },
                  { value: 'default_alarm', label: 'Default Alarm' },
                  { value: 'gentle_alarm', label: 'Gentle Alarm' },
                  { value: 'study_bell', label: 'Study Bell' },
                  { value: 'custom', label: 'Custom' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.recurrenceChip,
                      soundId === opt.value && styles.recurrenceChipActive,
                    ]}
                    onPress={() => {
                      handleAudioSelect(opt.value);
                      if (previewingSound) {
                        stopAudioPreview();
                        setPreviewingSound(null);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.recurrenceChipText,
                        soundId === opt.value && styles.recurrenceChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom Audio Pick & Preview Area */}
              {soundId === 'custom' && (
                <View style={styles.customAudioCard}>
                  <View style={styles.customAudioHeader}>
                    <Music size={18} color={colors.primary} />
                    <Text style={styles.customAudioTitle} numberOfLines={1}>
                      {soundName || 'No audio file selected'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.pickAudioBtn}
                    onPress={handlePickCustomAudio}
                    activeOpacity={0.7}
                  >
                    <FolderMusic size={16} color={colors.primary} />
                    <Text style={styles.pickAudioBtnText}>
                      {soundUri ? 'Change Audio File' : 'Pick Audio File (MP3, WAV)'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Audio Preview Bar */}
              <View style={styles.previewContainer}>
                <TouchableOpacity
                  style={[
                    styles.previewBtn,
                    previewingSound === soundId && styles.previewBtnActive,
                  ]}
                  onPress={() => handleTogglePreview(soundId)}
                  activeOpacity={0.7}
                >
                  {previewingSound === soundId ? (
                    <VolumeX size={16} color={colors.primaryForeground} />
                  ) : (
                    <Volume2 size={16} color={colors.primary} />
                  )}
                  <Text
                    style={[
                      styles.previewBtnText,
                      previewingSound === soundId && styles.previewBtnTextActive,
                    ]}
                  >
                    {previewingSound === soundId ? 'Stop Sound Preview' : 'Preview Selected Sound'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.audioDisclaimer}>
                When triggered, your device will ring at high priority with full alarm controls.
              </Text>

              {/* Notification Toggle */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Notification</Text>
                  <Text style={styles.switchSub}>Alert me at the scheduled time</Text>
                </View>
                <Switch
                  value={notificationEnabled}
                  onValueChange={setNotificationEnabled}
                  trackColor={{ false: colors.muted, true: colors.primary + '80' }}
                  thumbColor={notificationEnabled ? colors.primary : colors.mutedForeground}
                />
              </View>

              {/* Form error */}
              {!!formError && (
                <View style={styles.formErrorBox}>
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              )}
            </ScrollView>

            {/* Submit */}
            <View style={styles.sheetFooter}>
              <Button
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                style={styles.submitBtn}
              >
                {editingId ? 'Update reminder' : 'Schedule reminder'}
              </Button>
              <TouchableOpacity onPress={closeSheet} style={styles.cancelLink} activeOpacity={0.7}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (colors, typography, spacing, radii, insets, isDark) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: 80 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    fontFamily: typography.mono.medium,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.accent,
    marginBottom: 4,
  },
  screenTitle: {
    fontFamily: typography.serif.medium,
    fontSize: 28,
    color: colors.foreground,
    lineHeight: 34,
  },
  screenDetail: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    elevation: 3,
  },
  // Permission banner
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.destructive + '18',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  permBannerText: {
    fontFamily: typography.sans.regular,
    fontSize: 12,
    color: colors.destructive,
    flex: 1,
  },
  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  cardPast: { opacity: 0.55 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  cardTitle: {
    fontFamily: typography.sans.bold,
    fontSize: 15,
    color: colors.foreground,
    marginBottom: 2,
  },
  cardDescription: {
    fontFamily: typography.sans.regular,
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  textPast: { color: colors.mutedForeground },
  cardActions: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  actionIcon: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  deleteIcon: {},
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.muted + '60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.round,
    gap: 4,
  },
  metaText: {
    fontFamily: typography.sans.medium,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.round,
  },
  statusText: {
    fontFamily: typography.sans.bold,
    fontSize: 11,
  },
  // Error state
  errorState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.md },
  errorText: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  // Bottom sheet
  sheetWrapper: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { backgroundColor: '#000' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    maxHeight: '90%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cardBorder,
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sheetTitle: {
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
  },
  closeBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.muted + '60',
  },
  sheetScroll: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  fieldLabel: {
    fontFamily: typography.sans.bold,
    fontSize: 13,
    color: colors.foreground,
    marginBottom: 8,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: typography.sans.regular,
    fontSize: 15,
    color: colors.foreground,
    minHeight: 48,
  },
  inputMultiline: { minHeight: 72, paddingTop: 12 },
  inputError: { borderColor: colors.destructive },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    minHeight: 52,
  },
  pickerText: {
    fontFamily: typography.sans.medium,
    fontSize: 15,
    color: colors.foreground,
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  switchLabel: {
    fontFamily: typography.sans.bold,
    fontSize: 14,
    color: colors.foreground,
  },
  switchSub: {
    fontFamily: typography.sans.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  formErrorBox: {
    backgroundColor: colors.destructive + '18',
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  formErrorText: {
    fontFamily: typography.sans.medium,
    fontSize: 13,
    color: colors.destructive,
  },
  inlineErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.destructive + '18',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  inlineErrorText: {
    flex: 1,
    fontFamily: typography.sans.medium,
    fontSize: 12,
    color: colors.destructive,
  },
  sheetFooter: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: 8,
  },
  submitBtn: { minHeight: 52 },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: typography.sans.medium,
    fontSize: 15,
    color: colors.mutedForeground,
  },
  // Recurrence
  recurrenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  recurrenceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.round,
    backgroundColor: colors.muted + '60',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurrenceChipActive: {
    backgroundColor: colors.primary,
  },
  recurrenceChipText: {
    fontFamily: typography.sans.medium,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  recurrenceChipTextActive: {
    color: colors.primaryForeground,
  },
  // Weekday selector
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 4,
  },
  weekdayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.muted + '60',
  },
  weekdayBtnActive: {
    backgroundColor: colors.primary,
  },
  weekdayText: {
    fontFamily: typography.sans.bold,
    fontSize: 13,
    color: colors.mutedForeground,
  },
  weekdayTextActive: {
    color: colors.primaryForeground,
  },
  // Custom audio card & preview
  customAudioCard: {
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  customAudioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  customAudioTitle: {
    flex: 1,
    fontFamily: typography.sans.bold,
    fontSize: 13,
    color: colors.foreground,
  },
  pickAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary + '14',
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  pickAudioBtnText: {
    fontFamily: typography.sans.bold,
    fontSize: 13,
    color: colors.primary,
  },
  previewContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.round,
    backgroundColor: colors.primary + '18',
  },
  previewBtnActive: {
    backgroundColor: colors.primary,
  },
  previewBtnText: {
    fontFamily: typography.sans.bold,
    fontSize: 12,
    color: colors.primary,
  },
  previewBtnTextActive: {
    color: colors.primaryForeground,
  },
  // Audio disclaimer
  audioDisclaimer: {
    fontFamily: typography.sans.regular,
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 8,
    fontStyle: 'italic',
  },
});

export default RemindersScreen;
