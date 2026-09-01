import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  GraduationCap,
  Search,
  X,
  Check,
  MapPin,
  Building2,
  ChevronDown,
  ArrowLeft,
  Pencil,
  Info
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useStyles } from '../../theme/theme';
import { getColleges, getCollegeStates } from '../../api/colleges';

export function CollegePicker({
  collegeId = null,
  collegeName = '',
  onSelect,
  label = 'College / University',
  placeholder = 'Search your college or university',
  disabled = false,
  style,
}) {
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radii, isDark } = useAppTheme();
  const styles = useStyles(createStyles);

  const [modalVisible, setModalVisible] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [statesList, setStatesList] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debounceTimeout = useRef(null);

  useEffect(() => {
    if (modalVisible && statesList.length === 0) {
      getCollegeStates()
        .then((data) => setStatesList(data || []))
        .catch(() => {});
    }
  }, [modalVisible, statesList.length]);

  const fetchColleges = useCallback(async (search, state) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getColleges({
        search: search.trim(),
        state: state.trim(),
        limit: 30,
      });
      setColleges(res.data || []);
    } catch (err) {
      setError('Unable to load colleges. Please check your connection.');
      setColleges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!modalVisible) return;

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      fetchColleges(searchQuery, selectedState);
    }, 300);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [modalVisible, searchQuery, selectedState, fetchColleges]);

  const handleOpenModal = () => {
    if (disabled) return;
    setIsManualMode(false);
    setSearchQuery('');
    setManualInput(collegeName && !collegeId ? collegeName : '');
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setIsManualMode(false);
  };

  const handleSelectCollege = (item) => {
    onSelect?.({
      collegeId: item.id,
      collegeName: item.name,
    });
    handleCloseModal();
  };

  const handleSaveManual = () => {
    const trimmed = manualInput.trim();
    if (!trimmed) return;

    onSelect?.({
      collegeId: null,
      collegeName: trimmed,
    });
    handleCloseModal();
  };

  const handleClear = () => {
    onSelect?.({
      collegeId: null,
      collegeName: '',
    });
  };

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case 'Institute of National Importance':
        return { bg: colors.accent + '22', text: colors.accent, label: 'National Institute' };
      case 'University':
      case 'Deemed University':
        return { bg: colors.primary + '20', text: colors.primary, label: 'University' };
      default:
        return { bg: colors.muted + '80', text: colors.mutedForeground, label: 'College' };
    }
  };

  const hasSelection = Boolean(collegeName && collegeName.trim());

  return (
    <View style={[styles.wrapper, style]}>

      <TouchableOpacity
        style={[
          styles.trigger,
          hasSelection && styles.triggerSelected,
          disabled && styles.disabled,
        ]}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <View style={styles.triggerLeft}>
          <GraduationCap
            size={18}
            color={hasSelection ? colors.primary : colors.mutedForeground}
            style={{ marginRight: 10 }}
          />
          <View style={{ flex: 1 }}>
            {hasSelection ? (
              <>
                <Text style={styles.triggerSelectedTitle} numberOfLines={1}>
                  {collegeName}
                </Text>
                <Text style={styles.triggerSubtitle}>
                  {collegeId ? 'Listed Institution' : 'Custom / Unlisted Institution'}
                </Text>
              </>
            ) : (
              <Text style={styles.placeholderText} numberOfLines={1}>
                {placeholder}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.triggerActions}>
          {hasSelection && !disabled && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          <ChevronDown size={18} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >

          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={handleCloseModal}
          />

          <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>

            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              {isManualMode ? (
                <TouchableOpacity
                  onPress={() => setIsManualMode(false)}
                  style={styles.backBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ArrowLeft size={20} color={colors.foreground} />
                </TouchableOpacity>
              ) : (
                <View style={styles.headerIconWrapper}>
                  <GraduationCap size={18} color={colors.primary} />
                </View>
              )}

              <Text style={styles.sheetTitle}>
                {isManualMode ? 'Enter College Name' : 'Select College / University'}
              </Text>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleCloseModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {isManualMode ? (

              <ScrollView
                contentContainerStyle={styles.manualContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.manualInstruction}>
                  If your institution isn't listed in our curated database, you can enter its full name manually below.
                </Text>

                <Text style={styles.fieldLabel}>College / University Name</Text>
                <TextInput
                  style={styles.manualInput}
                  value={manualInput}
                  onChangeText={setManualInput}
                  placeholder="Enter your college name"
                  placeholderTextColor={colors.mutedForeground}
                  autoFocus
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    !manualInput.trim() && styles.primaryBtnDisabled,
                  ]}
                  onPress={handleSaveManual}
                  disabled={!manualInput.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryBtnText}>Confirm College</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setIsManualMode(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryBtnText}>Back to Search</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={styles.searchListWrapper}>

                <View style={styles.searchBarContainer}>
                  <Search size={18} color={colors.mutedForeground} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search college name, short code, or city..."
                    placeholderTextColor={colors.mutedForeground}
                    clearButtonMode="while-editing"
                    returnKeyType="search"
                  />
                  {!!searchQuery && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                      <X size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.stateBarWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statePillsScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.statePill,
                        !selectedState && styles.statePillActive,
                      ]}
                      onPress={() => setSelectedState('')}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.statePillText,
                          !selectedState && styles.statePillTextActive,
                        ]}
                      >
                        All States & UTs
                      </Text>
                    </TouchableOpacity>

                    {statesList.map((stateName) => (
                      <TouchableOpacity
                        key={stateName}
                        style={[
                          styles.statePill,
                          selectedState === stateName && styles.statePillActive,
                        ]}
                        onPress={() =>
                          setSelectedState(selectedState === stateName ? '' : stateName)
                        }
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.statePillText,
                            selectedState === stateName && styles.statePillTextActive,
                          ]}
                        >
                          {stateName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {loading ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loadingText}>Searching institutions...</Text>
                  </View>
                ) : error ? (
                  <View style={styles.centerBox}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => fetchColleges(searchQuery, selectedState)}
                    >
                      <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <FlatList
                    data={colleges}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                      const isSelected = item.id === collegeId;
                      const badge = getTypeBadgeStyle(item.type);

                      return (
                        <TouchableOpacity
                          style={[styles.collegeCard, isSelected && styles.collegeCardSelected]}
                          onPress={() => handleSelectCollege(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.cardHeaderRow}>
                            <Text
                              style={[styles.collegeName, isSelected && styles.collegeNameSelected]}
                              numberOfLines={2}
                            >
                              {item.name}
                            </Text>
                            {isSelected && <Check size={18} color={colors.accent} />}
                          </View>

                          <View style={styles.cardFooterRow}>
                            <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                              <Text style={[styles.typeBadgeText, { color: badge.text }]}>
                                {badge.label}
                              </Text>
                            </View>

                            <View style={styles.locationChip}>
                              <MapPin size={12} color={colors.mutedForeground} style={{ marginRight: 3 }} />
                              <Text style={styles.locationText} numberOfLines={1}>
                                {item.city ? `${item.city}, ` : ''}{item.state}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <View style={styles.emptyBox}>
                        <Building2 size={32} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                        <Text style={styles.emptyTitle}>No matching institutions</Text>
                        <Text style={styles.emptySubtitle}>
                          We couldn't find a matching college in this state or query.
                        </Text>
                        <TouchableOpacity
                          style={styles.manualFallbackBtn}
                          onPress={() => setIsManualMode(true)}
                          activeOpacity={0.8}
                        >
                          <Pencil size={15} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.manualFallbackBtnText}>Enter My College Manually</Text>
                        </TouchableOpacity>
                      </View>
                    }
                  />
                )}

                <View style={styles.bottomBar}>
                  <TouchableOpacity
                    style={styles.unlistedLink}
                    onPress={() => setIsManualMode(true)}
                    activeOpacity={0.7}
                  >
                    <Info size={15} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.unlistedLinkText}>My college isn't listed</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii, isDark }) =>
  StyleSheet.create({
    wrapper: {
      width: '100%',
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 52,
      backgroundColor: colors.background,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    triggerSelected: {
      borderColor: colors.primary + '50',
      backgroundColor: colors.card,
    },
    disabled: {
      opacity: 0.5,
    },
    triggerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: spacing.sm,
    },
    placeholderText: {
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.mutedForeground,
    },
    triggerSelectedTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    triggerSubtitle: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    triggerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    clearBtn: {
      padding: 4,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheetContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '90%',
      minHeight: '65%',
      borderTopWidth: 1,
      borderColor: colors.cardBorder,
    },
    sheetHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.cardBorder,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 4,
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
    headerIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: radii.md,
      backgroundColor: colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtn: {
      padding: 4,
    },
    sheetTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 18,
      color: colors.foreground,
      flex: 1,
      marginHorizontal: spacing.sm,
    },
    closeBtn: {
      padding: 4,
    },
    searchListWrapper: {
      flex: 1,
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      minHeight: 46,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.foreground,
      paddingVertical: 8,
    },
    searchClearBtn: {
      padding: 4,
    },
    stateBarWrapper: {
      marginVertical: spacing.sm,
    },
    statePillsScroll: {
      paddingHorizontal: spacing.lg,
      gap: 6,
    },
    statePill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radii.round,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    statePillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    statePillText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    statePillTextActive: {
      color: colors.primaryForeground,
      fontFamily: typography.sans.bold,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: 20,
      gap: 8,
    },
    collegeCard: {
      backgroundColor: colors.background,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
    },
    collegeCardSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '0C',
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 8,
      gap: 8,
    },
    collegeName: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
      lineHeight: 19,
    },
    collegeNameSelected: {
      color: colors.accent,
    },
    cardFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 6,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.md,
    },
    typeBadgeText: {
      fontFamily: typography.mono.medium,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    locationChip: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    locationText: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    centerBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      gap: spacing.sm,
    },
    loadingText: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
    },
    errorText: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.destructive,
      textAlign: 'center',
    },
    retryBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: radii.md,
      backgroundColor: colors.muted,
      marginTop: 4,
    },
    retryBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.foreground,
    },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    emptyTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 18,
      color: colors.foreground,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    manualFallbackBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.xl,
      backgroundColor: colors.primary + '18',
    },
    manualFallbackBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.primary,
    },
    bottomBar: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      backgroundColor: colors.card,
    },
    unlistedLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    unlistedLinkText: {
      fontFamily: typography.sans.semiBold,
      fontSize: 13,
      color: colors.primary,
    },
    manualContent: {
      padding: spacing.lg,
    },
    manualInstruction: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 19,
      marginBottom: spacing.lg,
    },
    fieldLabel: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.foreground,
      marginBottom: 8,
    },
    manualInput: {
      backgroundColor: colors.background,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: typography.sans.regular,
      fontSize: 15,
      color: colors.foreground,
      minHeight: 50,
      marginBottom: spacing.lg,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: radii.xl,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    primaryBtnDisabled: {
      opacity: 0.5,
    },
    primaryBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.primaryForeground,
    },
    secondaryBtn: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryBtnText: {
      fontFamily: typography.sans.medium,
      fontSize: 14,
      color: colors.mutedForeground,
    },
  });
