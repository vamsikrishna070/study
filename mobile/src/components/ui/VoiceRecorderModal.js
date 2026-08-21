import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Mic, Square, Play, Pause, Trash2, UploadCloud, X } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { useAppDialog } from './AppDialog';
import { Button } from './Button';
import { Input } from './Input';
import { Field } from './Field';
import { uploadFileToServer } from '../../utils/fileUploader';

// We import expo-audio dynamically or defensively to handle all environments
let expoAudio = null;
try {
  expoAudio = require('expo-audio');
} catch (e) {
  console.log('[VoiceRecorder] expo-audio import notice:', e.message);
}

export function VoiceRecorderModal({
  visible,
  onClose,
  onSave, // ({ url, publicId, originalName, mimeType, size, duration }) => void
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showError, showDialog } = useAppDialog();

  const [title, setTitle] = useState('');
  const [recordingStatus, setRecordingStatus] = useState('idle'); // idle | recording | stopped
  const [recordUri, setRecordUri] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);

  const timerRef = useRef(null);
  const recorderRef = useRef(null);
  const playerRef = useRef(null);

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
      if (recorderRef.current) {
        if (typeof recorderRef.current.stop === 'function') {
          await recorderRef.current.stop();
        }
        recorderRef.current = null;
      }
      if (playerRef.current) {
        if (typeof playerRef.current.pause === 'function') {
          playerRef.current.pause();
        }
        playerRef.current = null;
      }
    } catch (e) {
      console.log('[Audio cleanup]', e);
    }
  };

  const requestPermission = async () => {
    if (expoAudio?.AudioModule?.requestRecordingPermissionsAsync) {
      const { granted } = await expoAudio.AudioModule.requestRecordingPermissionsAsync();
      return granted;
    }
    return true;
  };

  const handleStartRecord = async () => {
    try {
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

      setDuration(0);
      if (expoAudio?.AudioRecorder) {
        const recorder = new expoAudio.AudioRecorder();
        await recorder.prepareToRecordAsync();
        recorder.record();
        recorderRef.current = recorder;
      }

      setRecordingStatus('recording');
      startTimer();
    } catch (err) {
      showError('Recording Error', err.message || 'Failed to start recording.');
    }
  };

  const handleStopRecord = async () => {
    try {
      stopTimer();
      let uri = null;
      if (recorderRef.current) {
        if (typeof recorderRef.current.stop === 'function') {
          await recorderRef.current.stop();
        }
        uri = recorderRef.current.uri;
      }
      setRecordUri(uri);
      setRecordingStatus('stopped');
    } catch (err) {
      showError('Recording Error', err.message || 'Failed to stop recording.');
    }
  };

  const handlePlayPause = async () => {
    if (!recordUri || !expoAudio?.createAudioPlayer) return;

    try {
      if (isPlaying) {
        if (playerRef.current) playerRef.current.pause();
        setIsPlaying(false);
      } else {
        if (!playerRef.current) {
          playerRef.current = expoAudio.createAudioPlayer(recordUri);
          playerRef.current.addListener('playbackStatusUpdate', (status) => {
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          });
        }
        playerRef.current.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.log('Playback error:', e);
    }
  };

  const handleSaveAndUpload = async () => {
    if (!recordUri && recordingStatus !== 'stopped') {
      showError('No Recording', 'Please record audio before saving.');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.m4a`;
      let uploadedData = {
        url: recordUri || '',
        publicId: '',
        originalName: title || 'Voice Recording',
        mimeType: 'audio/m4a',
        size: 0,
        duration,
      };

      if (recordUri) {
        const res = await uploadFileToServer({
          uri: recordUri,
          name: fileName,
          mimeType: 'audio/m4a',
        });
        uploadedData = {
          ...res,
          duration,
          originalName: title || res.originalName || 'Voice Recording',
        };
      }

      onSave?.(uploadedData);
      onClose();
    } catch (err) {
      showError('Upload Failed', err.message || 'Could not upload voice recording.');
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

            {/* Timer Display */}
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

            {/* Recording Controls */}
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
                  {recordUri && expoAudio?.createAudioPlayer && (
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

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Button variant="quiet" onPress={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onPress={handleSaveAndUpload}
              disabled={recordingStatus !== 'stopped' || uploading}
              loading={uploading}
            >
              <UploadCloud size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
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
