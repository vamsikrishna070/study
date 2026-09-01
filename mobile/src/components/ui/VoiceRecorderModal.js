import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Mic, Square, Play, Pause, Trash2, CloudUpload, X } from 'lucide-react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { useAppTheme, useStyles } from '../../theme/theme';
import { useAppDialog } from './AppDialog';
import { Button } from './Button';
import { Input } from './Input';
import { Field } from './Field';
import { uploadFileToServer } from '../../utils/fileUploader';
import { saveCustomAudio } from '../../services/documentService';
import { globalAudioPlayer } from '../../services/audioPlayerService';

export function VoiceRecorderModal({
  visible,
  onClose,
  onSave,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showError, showDialog } = useAppDialog();

  const [title, setTitle] = useState('');
  const [recordingStatus, setRecordingStatus] = useState('idle');
  const [recordUri, setRecordUri] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);

  const timerRef = useRef(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status?.hasError) {
      console.error('[VOICE RECORDER] Recording status error:', status.error);
    }
  });

  useEffect(() => {
    if (visible) {
      setTitle(`Voice Note ${new Date().toLocaleDateString()}`);
      setRecordingStatus('idle');
      setRecordUri(null);
      setDuration(0);
      setIsPlaying(false);
    } else {
      stopTimer();
      cleanupAudio();
    }
  }, [visible]);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanupAudio = async () => {
    try {
      if (recorder?.isRecording) {
        await recorder.stop();
      }
      await globalAudioPlayer.stop();
      setIsPlaying(false);
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (e) {
      console.warn('[VOICE RECORDER] Audio cleanup notice:', e?.message || e);
    }
  };

  const requestPermission = async () => {
    try {
      if (typeof getRecordingPermissionsAsync === 'function') {
        const current = await getRecordingPermissionsAsync();
        if (current.granted) return true;
      }
      if (typeof requestRecordingPermissionsAsync === 'function') {
        const req = await requestRecordingPermissionsAsync();
        return req.granted;
      }
    } catch (e) {
      console.warn('[VOICE RECORDER] Permission request error:', e?.message || e);
    }
    return true;
  };

  const handleStartRecord = async () => {
    try {
      await globalAudioPlayer.stop();
      setIsPlaying(false);

      const hasPermission = await requestPermission();
      if (!hasPermission) {
        showDialog({
          type: 'warning',
          title: 'Permission Denied',
          message: 'Microphone permission is required to record audio.',
          confirmText: 'OK',
        });
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      setDuration(0);
      await recorder.prepareToRecordAsync();
      recorder.record();

      setRecordingStatus('recording');
      startTimer();
    } catch (err) {
      console.error('[VOICE RECORDER] Start recording error:', err);
      showError('Recording Error', err.message || 'Failed to start recording.');
    }
  };

  const handleStopRecord = async () => {
    try {
      stopTimer();
      await recorder.stop();
      const uri = recorder.uri;

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (!uri) {
        throw new Error('Recording stopped but no audio file was produced.');
      }

      console.log(`[VOICE RECORDER DEBUG]\nrecordedUri: ${uri}`);
      setRecordUri(uri);
      setRecordingStatus('stopped');
    } catch (err) {
      console.error('[VOICE RECORDER] Stop recording error:', err);
      showError('Recording Error', err.message || 'Failed to stop recording.');
    }
  };

  const handlePlayPause = async () => {
    if (!recordUri) return;

    try {
      if (isPlaying) {
        await globalAudioPlayer.pause();
        setIsPlaying(false);
      } else {
        await globalAudioPlayer.play(recordUri, (status) => {
          if (status.status === 'playing') {
            setIsPlaying(true);
          } else if (status.status === 'finished' || status.status === 'paused' || status.status === 'error') {
            setIsPlaying(false);
          }
        });
      }
    } catch (e) {
      console.error('[VOICE RECORDER] Playback error:', e);
      setIsPlaying(false);
    }
  };

  const handleSaveAndUpload = async () => {
    if (!recordUri && recordingStatus !== 'stopped') {
      showError('No Recording', 'Please record audio before saving.');
      return;
    }

    setUploading(true);
    try {
      await globalAudioPlayer.stop();
      setIsPlaying(false);

      const safeBase = title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Voice_Note';
      const fileName = `${safeBase}_${Date.now()}.m4a`;

      let persistentUri = recordUri;
      let verifiedSize = 0;
      try {
        const saved = await saveCustomAudio({
          uri: recordUri,
          name: fileName,
        });
        persistentUri = saved.uri;
        verifiedSize = saved.size;
      } catch (saveErr) {
        console.warn('[VOICE RECORDER] Could not save to persistent audio directory, using recordUri:', saveErr);
      }

      let uploadedData = {
        url: persistentUri || '',
        publicId: '',
        originalName: title || 'Voice Recording',
        mimeType: 'audio/m4a',
        size: verifiedSize,
        duration,
      };

      try {
        const res = await uploadFileToServer({
          uri: persistentUri || recordUri,
          name: fileName,
          mimeType: 'audio/m4a',
        });
        if (res && res.url) {
          uploadedData = {
            ...res,
            duration,
            originalName: title || res.originalName || 'Voice Recording',
          };
        }
      } catch (uploadErr) {
        console.warn('[VOICE RECORDER] Upload failed, retaining persistent local file:', uploadErr);

      }

      onSave?.(uploadedData);
      onClose();
    } catch (err) {
      showError('Save Error', err.message || 'Could not save voice recording.');
    } finally {
      setUploading(false);
    }
  };

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Voice Recorder</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Field label="Recording Title">
              <Input
                value={title}
                onChangeText={setTitle}
                placeholder="Name your recording..."
              />
            </Field>

            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatSeconds(duration)}</Text>
              <Text style={styles.statusText}>
                {recordingStatus === 'recording'
                  ? 'Recording in progress...'
                  : recordingStatus === 'stopped'
                  ? 'Recording ready to save'
                  : 'Tap below to start recording'}
              </Text>
            </View>

            <View style={styles.controlsRow}>
              {recordingStatus === 'idle' && (
                <TouchableOpacity
                  style={[styles.recordBtn, { backgroundColor: colors.accent }]}
                  onPress={handleStartRecord}
                  activeOpacity={0.8}
                >
                  <Mic size={28} color="#ffffff" />
                </TouchableOpacity>
              )}

              {recordingStatus === 'recording' && (
                <TouchableOpacity
                  style={[styles.recordBtn, { backgroundColor: colors.destructive }]}
                  onPress={handleStopRecord}
                  activeOpacity={0.8}
                >
                  <Square size={26} color="#ffffff" fill="#ffffff" />
                </TouchableOpacity>
              )}

              {recordingStatus === 'stopped' && (
                <View style={styles.stoppedControls}>
                  {recordUri && (
                    <TouchableOpacity
                      style={styles.playbackBtn}
                      onPress={handlePlayPause}
                      activeOpacity={0.7}
                    >
                      {isPlaying ? (
                        <Pause size={20} color={colors.accent} />
                      ) : (
                        <Play size={20} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => {
                      globalAudioPlayer.stop();
                      setIsPlaying(false);
                      setRecordingStatus('idle');
                      setDuration(0);
                      setRecordUri(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={20} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <Button variant="quiet" onPress={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onPress={handleSaveAndUpload}
              disabled={recordingStatus !== 'stopped' || uploading}
              loading={uploading}
            >
              <CloudUpload size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
              Save & Upload
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(24,32,49,0.5)',
    },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      borderTopWidth: 1,
      borderColor: colors.cardBorder,
      paddingBottom: Platform.OS === 'ios' ? 30 : spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    title: {
      fontFamily: typography.serif.medium,
      fontSize: 18,
      color: colors.foreground,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    body: {
      padding: spacing.lg,
    },
    timerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.lg,
    },
    timerText: {
      fontFamily: typography.mono.medium,
      fontSize: 40,
      color: colors.foreground,
      letterSpacing: 2,
    },
    statusText: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: spacing.xs,
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
    },
    recordBtn: {
      width: 70,
      height: 70,
      borderRadius: radii.round,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 5,
    },
    stoppedControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    playbackBtn: {
      width: 50,
      height: 50,
      borderRadius: radii.round,
      backgroundColor: colors.accent + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetBtn: {
      width: 50,
      height: 50,
      borderRadius: radii.round,
      backgroundColor: colors.destructive + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
  });
