import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckCircle2, AlertTriangle, AlertCircle, Unlink, RefreshCw } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';

export function PortalConnectionBadge({
  status = 'checking',
  message,
  onReconnectPress,
  onConnectPress,
  onReconnect,
  onConnect,
  onRetry,
  style,
  compact = false,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const handleReconnect = onReconnectPress || onReconnect || onRetry;
  const handleConnect = onConnectPress || onConnect;

  const getStatusConfig = () => {
    switch (status) {
      case 'checking':
        return {
          icon: <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 6 }} />,
          defaultText: 'Checking portal connection...',
          bg: `${colors.cardBorder}30`,
          border: colors.cardBorder,
          text: colors.mutedForeground,
          actionText: null,
          onAction: null,
        };
      case 'connecting':
        return {
          icon: <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 6 }} />,
          defaultText: 'Establishing connection...',
          bg: `${colors.accent}15`,
          border: `${colors.accent}35`,
          text: colors.accent,
          actionText: null,
          onAction: null,
        };
      case 'verified':
        return {
          icon: <CheckCircle2 size={14} color="#10B981" style={{ marginRight: 6 }} />,
          defaultText: 'Connected and verified',
          bg: '#10B98115',
          border: '#10B98135',
          text: '#10B981',
          actionText: null,
          onAction: null,
        };
      case 'expired':
        return {
          icon: <AlertTriangle size={14} color="#F59E0B" style={{ marginRight: 6 }} />,
          defaultText: 'Session expired. Please reconnect.',
          bg: '#F59E0B15',
          border: '#F59E0B40',
          text: '#D97706',
          actionText: handleReconnect ? 'Reconnect' : null,
          onAction: handleReconnect,
        };
      case 'failed':
        return {
          icon: <AlertCircle size={14} color="#EF4444" style={{ marginRight: 6 }} />,
          defaultText: 'Unable to connect to portal',
          bg: '#EF444415',
          border: '#EF444440',
          text: '#EF4444',
          actionText: handleReconnect ? 'Retry' : null,
          onAction: handleReconnect,
        };
      case 'disconnected':
      default:
        return {
          icon: <Unlink size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />,
          defaultText: 'Portal connection required',
          bg: `${colors.mutedForeground}15`,
          border: `${colors.mutedForeground}30`,
          text: colors.mutedForeground,
          actionText: handleConnect ? 'Connect' : null,
          onAction: handleConnect,
        };
    }
  };

  const config = getStatusConfig();
  const displayText = message || config.defaultText;

  return (
    <View
      style={[
        styles.badgeContainer,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingVertical: compact ? 4 : 8,
          paddingHorizontal: compact ? 8 : 12,
        },
        style,
      ]}
      accessible={true}
      accessibilityLabel={`Portal connection: ${displayText}`}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.leftRow}>
        {config.icon}
        <Text
          style={[
            styles.statusText,
            { color: config.text },
            compact && { fontSize: 11 },
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
      </View>

      {config.actionText && config.onAction && (
        <TouchableOpacity
          onPress={config.onAction}
          style={[styles.actionBtn, { borderColor: config.border }]}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={config.actionText}
        >
          <Text style={[styles.actionBtnText, { color: config.text }]}>
            {config.actionText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = ({ typography, spacing, radii }) =>
  StyleSheet.create({
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: radii.md,
      gap: spacing.xs,
    },
    leftRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      flexShrink: 1,
    },
    actionBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
      borderWidth: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      marginLeft: spacing.xs,
    },
    actionBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 11,
    },
  });

export default PortalConnectionBadge;
