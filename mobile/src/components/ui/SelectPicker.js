import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ChevronDown, Check, X } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { Input } from './Input';

export function SelectPicker({
  label,
  value,
  onValueChange,
  options = [],
  placeholder = 'Select an option',
  disabled = false,
  searchable = false,
  style,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedOptions = options.map((opt) =>
    typeof opt === 'object' && opt !== null
      ? opt
      : { label: String(opt), value: opt }
  );

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  const filteredOptions = normalizedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (val) => {
    onValueChange?.(val);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={style}>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.disabled]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => {
              setModalVisible(false);
              setSearchQuery('');
            }}
          />
          <SafeAreaView style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || placeholder}</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {(searchable || normalizedOptions.length > 7) && (
              <View style={styles.searchContainer}>
                <Input
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search..."
                  style={styles.searchInput}
                />
              </View>
            )}

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => String(item.value)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = String(item.value) === String(value);
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, isSelected && styles.selectedRow]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.selectedOptionText,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Check size={18} color={colors.accent} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No options found</Text>
                </View>
              }
            />
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      backgroundColor: colors.background,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    disabled: {
      opacity: 0.5,
    },
    triggerText: {
      flex: 1,
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.foreground,
      marginRight: spacing.sm,
    },
    placeholderText: {
      color: colors.mutedForeground,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(24,32,49,0.5)',
    },
    sheetContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '75%',
      borderTopWidth: 1,
      borderColor: colors.cardBorder,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    sheetTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 18,
      color: colors.foreground,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    searchContainer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    searchInput: {
      minHeight: 38,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder + '50',
    },
    selectedRow: {
      backgroundColor: colors.muted + '40',
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
    },
    optionText: {
      fontFamily: typography.sans.medium,
      fontSize: 15,
      color: colors.foreground,
    },
    selectedOptionText: {
      fontFamily: typography.sans.bold,
      color: colors.accent,
    },
    emptyContainer: {
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.mutedForeground,
    },
  });
