import React, { useEffect, useRef, createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  BackHandler,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  Info, 
  AlertCircle, 
  HelpCircle,
  X
} from 'lucide-react-native';
import { Button } from './Button';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';

// ─── Declarative AppDialog Component ──────────────────────────────────────────

export function AppDialog({
  visible = false,
  onClose,
  title,
  message,
  type = 'default', // 'default' | 'destructive' | 'warning' | 'success' | 'info'
  icon: CustomIcon,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  dismissOnBackdrop = true,
  children,
}) {
  const { colors, typography, spacing, radii, isDark } = useAppTheme();
  const styles = useStyles(createStyles);
  
  const animValue = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.spring(animValue, {
        toValue: 1,
        tension: 70,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  // Handle Android hardware back button
  useEffect(() => {
    if (!visible) return;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loading) return true; // prevent dismiss during loading
      if (onCancel) {
        onCancel();
      } else if (onClose) {
        onClose();
      }
      return true;
    });
    return () => backHandler.remove();
  }, [visible, loading, onCancel, onClose]);

  if (!showModal) return null;

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.55],
  });

  const cardScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const cardOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cardTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  // Determine Icon and Accent
  let IconComponent = CustomIcon;
  let iconColor = colors.primary;
  let iconBgColor = `${colors.primary}18`;

  if (!IconComponent) {
    switch (type) {
      case 'destructive':
        IconComponent = Trash2;
        iconColor = colors.destructive;
        iconBgColor = `${colors.destructive}18`;
        break;
      case 'warning':
        IconComponent = AlertTriangle;
        iconColor = '#F59E0B';
        iconBgColor = '#F59E0B18';
        break;
      case 'success':
        IconComponent = CheckCircle2;
        iconColor = '#10B981';
        iconBgColor = '#10B98118';
        break;
      case 'info':
        IconComponent = Info;
        iconColor = colors.primary;
        iconBgColor = `${colors.primary}18`;
        break;
      default:
        IconComponent = HelpCircle;
        iconColor = colors.accent;
        iconBgColor = `${colors.accent}18`;
        break;
    }
  }

  const handleBackdropPress = () => {
    if (loading) return;
    if (dismissOnBackdrop && type !== 'destructive') {
      if (onCancel) onCancel();
      else if (onClose) onClose();
    }
  };

  const handleConfirmPress = async () => {
    if (onConfirm) {
      await onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  const handleCancelPress = () => {
    if (loading) return;
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none"
      onRequestClose={handleCancelPress}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
            },
          ]}
        >
          {/* Icon Header */}
          {IconComponent && (
            <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
              <IconComponent size={28} color={iconColor} />
            </View>
          )}

          {/* Title */}
          {!!title && (
            <Text style={styles.title}>{title}</Text>
          )}

          {/* Message */}
          {typeof message === 'string' ? (
            <Text style={styles.message}>{message}</Text>
          ) : (
            message
          )}

          {/* Optional Custom Content */}
          {children}

          {/* Action Buttons */}
          <View style={[styles.actionsRow, !cancelText && styles.actionsRowSingle]}>
            {!!cancelText && (
              <Button
                variant="outline"
                onPress={handleCancelPress}
                disabled={loading}
                style={styles.cancelBtn}
                textStyle={styles.cancelBtnText}
              >
                {cancelText}
              </Button>
            )}

            <Button
              variant={type === 'destructive' ? 'danger' : 'primary'}
              onPress={handleConfirmPress}
              loading={loading}
              disabled={loading}
              style={[
                styles.confirmBtn,
                !cancelText && styles.confirmBtnFull,
                type === 'destructive' && styles.destructiveConfirmBtn,
              ]}
              textStyle={type === 'destructive' ? styles.destructiveText : undefined}
            >
              {confirmText}
            </Button>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Imperative Dialog Context / Hook ─────────────────────────────────────────

const DialogContext = createContext(null);

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'default',
    icon: null,
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
    onCancel: null,
    loading: false,
    dismissOnBackdrop: true,
  });

  const showDialog = useCallback((options) => {
    return new Promise((resolve) => {
      setDialogState({
        visible: true,
        title: options.title || '',
        message: options.message || '',
        type: options.type || 'default',
        icon: options.icon || null,
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText !== undefined ? options.cancelText : null,
        dismissOnBackdrop: options.dismissOnBackdrop !== undefined ? options.dismissOnBackdrop : true,
        loading: false,
        onConfirm: async () => {
          if (options.onConfirm) {
            setDialogState((prev) => ({ ...prev, loading: true }));
            try {
              await options.onConfirm();
            } finally {
              setDialogState((prev) => ({ ...prev, visible: false, loading: false }));
              resolve(true);
            }
          } else {
            setDialogState((prev) => ({ ...prev, visible: false }));
            resolve(true);
          }
        },
        onCancel: () => {
          if (options.onCancel) options.onCancel();
          setDialogState((prev) => ({ ...prev, visible: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const hideDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showConfirm = useCallback((options) => {
    return showDialog({
      cancelText: 'Cancel',
      confirmText: 'Confirm',
      ...options,
    });
  }, [showDialog]);

  const showDeleteConfirm = useCallback((options) => {
    return showDialog({
      type: 'destructive',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      dismissOnBackdrop: false,
      ...options,
    });
  }, [showDialog]);

  const showError = useCallback((title, message) => {
    return showDialog({
      type: 'destructive',
      title: title || 'Error',
      message: message || 'Something went wrong. Please try again.',
      confirmText: 'OK',
    });
  }, [showDialog]);

  const showSuccess = useCallback((title, message) => {
    return showDialog({
      type: 'success',
      title: title || 'Success',
      message: message || 'Operation completed successfully.',
      confirmText: 'Done',
    });
  }, [showDialog]);

  return (
    <DialogContext.Provider value={{ showDialog, hideDialog, showConfirm, showDeleteConfirm, showError, showSuccess }}>
      {children}
      <AppDialog
        visible={dialogState.visible}
        onClose={hideDialog}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        icon={dialogState.icon}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        onConfirm={dialogState.onConfirm}
        onCancel={dialogState.onCancel}
        loading={dialogState.loading}
        dismissOnBackdrop={dialogState.dismissOnBackdrop}
      />
    </DialogContext.Provider>
  );
};

export const useAppDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    // Return safe fallback if not wrapped
    return {
      showDialog: () => Promise.resolve(true),
      hideDialog: () => {},
      showConfirm: () => Promise.resolve(true),
      showDeleteConfirm: () => Promise.resolve(true),
      showError: () => Promise.resolve(true),
      showSuccess: () => Promise.resolve(true),
    };
  }
  return context;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = ({ colors, typography, spacing, radii, isDark }) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    backdrop: {
      backgroundColor: '#000000',
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.card,
      borderRadius: radii.xxl,
      padding: spacing.xl,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowRadius: 24,
      elevation: 24,
    },
    iconContainer: {
      width: 58,
      height: 58,
      borderRadius: radii.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: {
      fontFamily: typography.serif.medium,
      fontSize: 22,
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: spacing.xs,
      letterSpacing: -0.3,
    },
    message: {
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.xs,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      width: '100%',
      marginTop: spacing.xs,
    },
    actionsRowSingle: {
      justifyContent: 'center',
    },
    cancelBtn: {
      flex: 1,
      minHeight: 46,
    },
    cancelBtnText: {
      fontFamily: typography.sans.semiBold,
      fontSize: 14,
    },
    confirmBtn: {
      flex: 1,
      minHeight: 46,
    },
    confirmBtnFull: {
      flex: 1,
    },
    destructiveConfirmBtn: {
      backgroundColor: colors.destructive,
    },
    destructiveText: {
      color: '#FFFFFF',
      fontFamily: typography.sans.bold,
    },
  });
