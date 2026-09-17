import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {
  Calculator,
  RotateCcw,
  AlertCircle,
  BookOpen,
  Plus,
  Minus,
  RefreshCw,
  ArrowRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getAttendancePlanner, verifyPortalSession, syncPortalData } from '../../api/portal';
import { calculateSimulation, getRiskColor } from '../../utils/attendancePlannerUtils';
import { getUserFriendlyError } from '../../utils/errorUtils';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

export default function AttendancePlannerScreen({ navigation, route }) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const initialSubjectCode = (route && route.params && route.params.initialSubjectCode) ? route.params.initialSubjectCode : null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  const [portalStatus, setPortalStatus] = useState('checking');
  const [portalMessage, setPortalMessage] = useState('Checking portal connection...');

  // Selected subject for detailed interactive simulation
  const [selectedCode, setSelectedCode] = useState(initialSubjectCode);

  // Simulations state per subject code: { [subjectCode]: { bunks: number, attend: number } }
  const [simulations, setSimulations] = useState({});

  // Custom number input modal state
  const [inputModalVisible, setInputModalVisible] = useState(false);
  const [inputModalType, setInputModalType] = useState('bunks'); // 'bunks' | 'attend'
  const [customInputValue, setCustomInputValue] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const [plannerRes, verifyRes] = await Promise.allSettled([
        getAttendancePlanner(),
        verifyPortalSession(),
      ]);

      if (plannerRes.status === 'fulfilled') {
        const val = plannerRes.value;
        const payload = (val && val.data) ? val.data : (val || {});
        setData(payload);

        if (Array.isArray(payload.subjects) && payload.subjects.length > 0) {
          setSelectedCode((prev) => {
            if (prev && payload.subjects.some((s) => s.subjectCode === prev)) {
              return prev;
            }
            return payload.subjects[0].subjectCode;
          });
        }
      } else {
        console.error('[AttendancePlannerScreen] Load error:', plannerRes.reason);
        setError(getUserFriendlyError(plannerRes.reason, 'portal_sync'));
      }

      if (verifyRes.status === 'fulfilled') {
        const v = verifyRes.value;
        const status = (v && v.status) ? v.status : (v && v.isConnected ? 'verified' : 'disconnected');
        setPortalStatus(status);
        setPortalMessage((v && v.message) ? v.message : '');
      } else {
        setPortalStatus('failed');
        setPortalMessage('Unable to connect to portal');
      }
    } catch (err) {
      console.error('[AttendancePlannerScreen] Unexpected error:', err);
      setError('Unable to load attendance planning data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncPortalData();
    } catch (e) {
      console.warn('[AttendancePlannerScreen] Sync warning:', e.message);
    } finally {
      await loadData(true);
      setSyncing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
  };

  const subjects = useMemo(() => {
    return (data && Array.isArray(data.subjects)) ? data.subjects : [];
  }, [data]);

  const selectedSubject = useMemo(() => {
    if (!subjects.length) return null;
    return subjects.find((s) => s.subjectCode === selectedCode) || subjects[0];
  }, [subjects, selectedCode]);

  const currentSim = useMemo(() => {
    if (!selectedSubject) return { bunks: 0, attend: 0 };
    return simulations[selectedSubject.subjectCode] || { bunks: 0, attend: 0 };
  }, [simulations, selectedSubject]);

  const simulationResult = useMemo(() => {
    if (!selectedSubject) {
      return {
        projectedConducted: 0,
        projectedAttended: 0,
        projectedAbsences: 0,
        projectedPercentage: 0,
        safeBunksRemaining: 0,
        recoveryClassesNeeded: 0,
        riskTier: 'SAFE',
        riskLabel: 'Safe',
        hasSimulations: false,
      };
    }

    return calculateSimulation({
      conducted: selectedSubject.conducted,
      attended: selectedSubject.present,
      odMlPct: selectedSubject.odMlPercentage,
      simulatedBunks: currentSim.bunks,
      simulatedAttended: currentSim.attend,
    });
  }, [selectedSubject, currentSim]);

  const updateSimulation = (type, delta) => {
    if (!selectedSubject) return;
    const code = selectedSubject.subjectCode;
    const existing = simulations[code] || { bunks: 0, attend: 0 };
    const currentVal = type === 'bunks' ? existing.bunks : existing.attend;
    const newVal = Math.max(0, currentVal + delta);

    setSimulations((prev) => ({
      ...prev,
      [code]: {
        ...existing,
        [type]: newVal,
      },
    }));
  };

  const setExactSimulation = (type, val) => {
    if (!selectedSubject) return;
    const code = selectedSubject.subjectCode;
    const existing = simulations[code] || { bunks: 0, attend: 0 };
    const num = Math.max(0, parseInt(val, 10) || 0);

    setSimulations((prev) => ({
      ...prev,
      [code]: {
        ...existing,
        [type]: num,
      },
    }));
  };

  const resetCurrentSimulation = () => {
    if (!selectedSubject) return;
    const code = selectedSubject.subjectCode;
    setSimulations((prev) => ({
      ...prev,
      [code]: { bunks: 0, attend: 0 },
    }));
  };

  const handleOpenCustomInput = (type) => {
    setInputModalType(type);
    const subCode = selectedSubject ? selectedSubject.subjectCode : '';
    const existing = (subCode && simulations[subCode]) ? simulations[subCode] : { bunks: 0, attend: 0 };
    setCustomInputValue(String(type === 'bunks' ? existing.bunks : existing.attend));
    setInputModalVisible(true);
  };

  const handleSaveCustomInput = () => {
    setExactSimulation(inputModalType, customInputValue);
    setInputModalVisible(false);
  };

  const overallStats = useMemo(() => {
    if (!subjects.length) {
      return { overallPct: 0, criticalCount: 0, totalSubjects: 0 };
    }
    let totalC = 0;
    let totalP = 0;
    let totalOd = 0;
    let criticalCount = 0;

    subjects.forEach((s) => {
      const sim = simulations[s.subjectCode] || { bunks: 0, attend: 0 };
      const res = calculateSimulation({
        conducted: s.conducted,
        attended: s.present,
        odMlPct: s.odMlPercentage,
        simulatedBunks: sim.bunks,
        simulatedAttended: sim.attend,
      });

      totalC += res.projectedConducted;
      totalP += res.projectedAttended;
      totalOd += (s.odMlPercentage / 100) * res.projectedConducted;
      if (res.riskTier === 'CRITICAL') criticalCount++;
    });

    const overallPct = totalC > 0 ? parseFloat((((totalP + totalOd) / totalC) * 100).toFixed(2)) : 0;
    return {
      overallPct,
      criticalCount,
      totalSubjects: subjects.length,
    };
  }, [subjects, simulations]);

  const isWide = windowWidth >= 640;

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('DrawerRoot', {
        screen: 'HomeDrawer',
        params: { screen: 'OverviewTab' },
      });
    }
  }, [navigation]);

  const renderHeaderRight = () => (
    <TouchableOpacity
      style={[
        styles.headerSyncBtn,
        syncing && styles.headerSyncBtnDisabled,
      ]}
      onPress={handleSync}
      disabled={syncing}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={syncing ? 'Syncing attendance' : 'Sync Attendance'}
    >
      {syncing ? (
        <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 5 }} />
      ) : (
        <RefreshCw size={13} color="#ffffff" style={{ marginRight: 5 }} />
      )}
      <Text style={styles.headerSyncBtnText}>{syncing ? 'Syncing...' : 'Sync'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Attendance Planner"
        showBack={true}
        onBack={handleBackPress}
        onBackPress={handleBackPress}
        rightElement={renderHeaderRight()}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <PageHeading
          eyebrow="ACADEMIC FORECAST"
          title="Attendance Planner"
          detail="Simulate absences, compute safe bunks, and calculate classes needed for 75% eligibility."
        />

        {loading && !data ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading attendance data & planning models...</Text>
          </View>
        ) : error && !subjects.length ? (
          <Card style={styles.errorCard}>
            <AlertCircle size={32} color="#EF4444" style={{ marginBottom: 12 }} />
            <Text style={styles.errorTitle}>Attendance Data Unavailable</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Button
              title="Try Again"
              variant="outline"
              size="sm"
              onPress={() => loadData(true)}
              style={{ marginTop: 16 }}
            />
          </Card>
        ) : subjects.length === 0 ? (
          <Card style={styles.emptyCard}>
            <BookOpen size={36} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Enrolled Courses Found</Text>
            <Text style={styles.emptyBody}>
              Connect your SRM AP portal or perform a sync to populate course attendance.
            </Text>
            <Button
              title="Connect Portal"
              size="sm"
              onPress={() => navigation.navigate('PortalDashboard', { screen: 'PortalDashboardMain' })}
              style={{ marginTop: 16 }}
            />
          </Card>
        ) : (
          <View>
            {/* Top Summary Dashboard */}
            <Card style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <View style={styles.overviewIconWrap}>
                  <Calculator size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.overviewEyebrow}>OVERALL ATTENDANCE SUMMARY</Text>
                  <Text style={styles.overviewTitle}>Campus Eligibility Projection</Text>
                </View>
              </View>

              <View style={styles.overviewGrid}>
                <View style={styles.overviewMetricBox}>
                  <Text style={styles.metricLabel}>Projected %</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      overallStats.overallPct < 75 ? { color: '#EF4444' } : { color: '#10B981' },
                    ]}
                  >
                    {overallStats.overallPct.toFixed(2)}%
                  </Text>
                  <Text style={styles.metricSub}>Req: 75.00%</Text>
                </View>

                <View style={styles.overviewMetricBox}>
                  <Text style={styles.metricLabel}>Can Skip</Text>
                  <Text style={[styles.metricValue, { color: colors.foreground }]}>
                    {selectedSubject ? simulationResult.safeBunksRemaining : '-'}
                  </Text>
                  <Text style={styles.metricSub} numberOfLines={1}>
                    {selectedSubject ? selectedSubject.subjectCode : 'Select a subject'}
                  </Text>
                </View>

                <View style={styles.overviewMetricBox}>
                  <Text style={styles.metricLabel}>Subjects At Risk</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      overallStats.criticalCount > 0 ? { color: '#EF4444' } : { color: '#10B981' },
                    ]}
                  >
                    {overallStats.criticalCount}
                  </Text>
                  <Text style={styles.metricSub}>
                    {overallStats.criticalCount > 0 ? 'Action Needed' : 'All Clear'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Course Selector Horizontal Scroll */}
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionTitle}>SELECT SUBJECT TO SIMULATE</Text>
              <Text style={styles.sectionSub}>Choose a course to test planned absences or attendance</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subjectPillsList}
            >
              {subjects.map((sub) => {
                const isSelected = sub.subjectCode === selectedCode;
                const sim = simulations[sub.subjectCode] || { bunks: 0, attend: 0 };
                const res = calculateSimulation({
                  conducted: sub.conducted,
                  attended: sub.present,
                  odMlPct: sub.odMlPercentage,
                  simulatedBunks: sim.bunks,
                  simulatedAttended: sim.attend,
                });
                const subRisk = getRiskColor(res.riskTier);

                return (
                  <TouchableOpacity
                    key={sub.subjectCode}
                    style={[
                      styles.subjectPill,
                      isSelected && {
                        borderColor: colors.primary,
                        backgroundColor: colors.card,
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => setSelectedCode(sub.subjectCode)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pillTop}>
                      <Text
                        style={[
                          styles.pillCode,
                          isSelected && { color: colors.primary, fontFamily: typography.sans.bold },
                        ]}
                      >
                        {sub.subjectCode}
                      </Text>
                      <View style={[styles.pillPctBadge, { backgroundColor: subRisk.badgeBg }]}>
                        <Text style={[styles.pillPctText, { color: subRisk.badgeText }]}>
                          {res.projectedPercentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.pillName} numberOfLines={1}>
                      {sub.subjectName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Interactive Simulation Sandbox Card */}
            {selectedSubject && (
              <Card style={styles.sandboxCard}>
                <View style={styles.sandboxHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.sandboxCode}>{selectedSubject.subjectCode}</Text>
                    <Text style={styles.sandboxName}>{selectedSubject.subjectName}</Text>
                  </View>

                  <View style={styles.sandboxHeaderActions}>
                    {simulationResult.hasSimulations && (
                      <TouchableOpacity
                        style={styles.revertBtn}
                        onPress={resetCurrentSimulation}
                        activeOpacity={0.7}
                        accessibilityLabel="Reset Simulation"
                      >
                        <RotateCcw size={14} color={colors.mutedForeground} />
                        <Text style={styles.revertBtnText}>Reset</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Percentage Impact Bar */}
                <View style={styles.impactBarContainer}>
                  <View style={styles.impactNumbersRow}>
                    <View>
                      <Text style={styles.impactLabel}>Current Actual</Text>
                      <Text style={styles.actualPctText}>{selectedSubject.percentage.toFixed(2)}%</Text>
                    </View>
                    <ArrowRight size={18} color={colors.mutedForeground} style={{ alignSelf: 'center' }} />
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.impactLabel}>Projected Simulated</Text>
                      <Text
                        style={[
                          styles.projectedPctText,
                          {
                            color:
                              simulationResult.projectedPercentage < 75
                                ? '#EF4444'
                                : colors.foreground,
                          },
                        ]}
                      >
                        {simulationResult.projectedPercentage.toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  {/* Progress Line */}
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, simulationResult.projectedPercentage))}%`,
                          backgroundColor:
                            simulationResult.projectedPercentage < 75
                              ? '#EF4444'
                              : colors.primary,
                        },
                      ]}
                    />
                    {/* 75% Target Marker */}
                    <View style={styles.marker75}>
                      <View style={styles.markerLine} />
                      <Text style={styles.markerText}>75% Target</Text>
                    </View>
                  </View>
                </View>

                {/* Simulation Steppers */}
                <View style={styles.steppersContainer}>
                  {/* Planned Absences (Bunks) */}
                  <View style={styles.stepperBlock}>
                    <View style={styles.stepperHeader}>
                      <Text style={styles.stepperTitle}>SIMULATE ABSENCES</Text>
                      <TouchableOpacity onPress={() => handleOpenCustomInput('bunks')}>
                        <Text style={styles.customInputLink}>Custom</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.stepperControls}>
                      <TouchableOpacity
                        style={[styles.stepBtn, currentSim.bunks <= 0 && styles.stepBtnDisabled]}
                        onPress={() => updateSimulation('bunks', -1)}
                        disabled={currentSim.bunks <= 0}
                      >
                        <Minus size={16} color={currentSim.bunks <= 0 ? colors.mutedForeground : colors.foreground} />
                      </TouchableOpacity>
                      <View style={styles.stepValueBox}>
                        <Text style={[styles.stepValueText, { color: '#EF4444' }]}>
                          +{currentSim.bunks}
                        </Text>
                        <Text style={styles.stepUnitText}>Future bunk</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateSimulation('bunks', 1)}
                      >
                        <Plus size={16} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.quickChipsRow}>
                      {[1, 2, 3, 5].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={styles.quickChip}
                          onPress={() => updateSimulation('bunks', amt)}
                        >
                          <Text style={styles.quickChipText}>+{amt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Future Attended Classes */}
                  <View style={styles.stepperBlock}>
                    <View style={styles.stepperHeader}>
                      <Text style={styles.stepperTitle}>SIMULATE ATTENDING</Text>
                      <TouchableOpacity onPress={() => handleOpenCustomInput('attend')}>
                        <Text style={styles.customInputLink}>Custom</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.stepperControls}>
                      <TouchableOpacity
                        style={[styles.stepBtn, currentSim.attend <= 0 && styles.stepBtnDisabled]}
                        onPress={() => updateSimulation('attend', -1)}
                        disabled={currentSim.attend <= 0}
                      >
                        <Minus size={16} color={currentSim.attend <= 0 ? colors.mutedForeground : colors.foreground} />
                      </TouchableOpacity>
                      <View style={styles.stepValueBox}>
                        <Text style={[styles.stepValueText, { color: '#10B981' }]}>
                          +{currentSim.attend}
                        </Text>
                        <Text style={styles.stepUnitText}>Future Classes</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => updateSimulation('attend', 1)}
                      >
                        <Plus size={16} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.quickChipsRow}>
                      {[1, 2, 3, 5].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={styles.quickChip}
                          onPress={() => updateSimulation('attend', amt)}
                        >
                          <Text style={styles.quickChipText}>+{amt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Simulated Numbers Breakdown */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricBox}>
                    <Text style={styles.boxLabel}>Conducted</Text>
                    <Text style={styles.boxVal}>
                      {simulationResult.projectedConducted}{' '}
                      <Text style={styles.boxValSub}>({selectedSubject.conducted})</Text>
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.boxLabel}>Present</Text>
                    <Text style={[styles.boxVal, { color: '#10B981' }]}>
                      {simulationResult.projectedAttended}{' '}
                      <Text style={styles.boxValSub}>({selectedSubject.present})</Text>
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.boxLabel}>Absent</Text>
                    <Text style={[styles.boxVal, { color: '#EF4444' }]}>
                      {simulationResult.projectedAbsences}{' '}
                      <Text style={styles.boxValSub}>({selectedSubject.absent})</Text>
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.boxLabel}>OD / ML</Text>
                    <Text style={[styles.boxVal, { color: '#8B5CF6' }]}>
                      {selectedSubject.odMl || 0}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Complete Subjects Analysis List */}
            <View style={styles.allSubjectsSection}>
              <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionTitle}>ALL ENROLLED COURSES ({subjects.length})</Text>
                <Text style={styles.sectionSub}>Quick summary of current standing & safe skip limit</Text>
              </View>

              {subjects.map((sub) => {
                const sim = simulations[sub.subjectCode] || { bunks: 0, attend: 0 };
                const res = calculateSimulation({
                  conducted: sub.conducted,
                  attended: sub.present,
                  odMlPct: sub.odMlPercentage,
                  simulatedBunks: sim.bunks,
                  simulatedAttended: sim.attend,
                });
                const subRisk = getRiskColor(res.riskTier);
                const isCurrent = sub.subjectCode === selectedCode;

                return (
                  <TouchableOpacity
                    key={sub.subjectCode}
                    style={[
                      styles.courseRowCard,
                      isCurrent && { borderColor: colors.primary, borderWidth: 1.5 },
                    ]}
                    onPress={() => setSelectedCode(sub.subjectCode)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.courseRowHeader}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.courseRowCode}>{sub.subjectCode}</Text>
                        <Text style={styles.courseRowName} numberOfLines={1}>
                          {sub.subjectName}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.courseRowPct, { color: subRisk.text }]}>
                          {res.projectedPercentage.toFixed(2)}%
                        </Text>
                        <Text style={styles.courseRowBuffer}>
                          {res.safeBunksRemaining > 0
                            ? `${res.safeBunksRemaining} safe bunks`
                            : res.recoveryClassesNeeded > 0
                            ? `Need ${res.recoveryClassesNeeded} classes`
                            : 'Borderline'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.miniProgressBg}>
                      <View
                        style={[
                          styles.miniProgressFill,
                          {
                            width: `${Math.min(100, Math.max(0, res.projectedPercentage))}%`,
                            backgroundColor: subRisk.text,
                          },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Custom Simulation Input Modal */}
      <Modal
        visible={inputModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInputModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {inputModalType === 'bunks' ? 'Enter Planned Absences' : 'Enter Planned Attended Classes'}
            </Text>
            <Text style={styles.modalSub}>
              {inputModalType === 'bunks'
                ? 'Specify the number of upcoming classes you plan to skip.'
                : 'Specify the number of upcoming classes you plan to attend.'}
            </Text>

            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              value={customInputValue}
              onChangeText={setCustomInputValue}
              autoFocus
              selectTextOnFocus
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => setInputModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Apply"
                size="sm"
                onPress={handleSaveCustomInput}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme) => {
  const { colors, typography, spacing, radii } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
    },
    headerSyncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      height: 34,
      borderRadius: radii.md,
      minWidth: 70,
    },
    headerSyncBtnDisabled: {
      opacity: 0.6,
    },
    headerSyncBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: '#ffffff',
    },
    loadingContainer: {
      paddingVertical: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 12,
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.mutedForeground,
    },
    errorCard: {
      padding: spacing.lg,
      alignItems: 'center',
      textAlign: 'center',
      borderColor: '#FCA5A5',
      backgroundColor: colors.card,
    },
    errorTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 16,
      color: '#EF4444',
      marginBottom: 6,
    },
    errorBody: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    emptyCard: {
      padding: spacing.xl,
      alignItems: 'center',
      textAlign: 'center',
      backgroundColor: colors.card,
    },
    emptyTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 16,
      color: colors.foreground,
      marginBottom: 6,
    },
    emptyBody: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    overviewCard: {
      padding: spacing.md,
      marginBottom: spacing.lg,
      backgroundColor: colors.card,
    },
    overviewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    overviewIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: `${colors.primary}1A`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overviewEyebrow: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      color: colors.mutedForeground,
      letterSpacing: 0.5,
    },
    overviewTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
      color: colors.foreground,
    },
    overviewGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    overviewMetricBox: {
      flex: 1,
      backgroundColor: colors.muted,
      padding: spacing.sm,
      borderRadius: radii.md,
      alignItems: 'center',
    },
    metricLabel: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.mutedForeground,
      marginBottom: 2,
    },
    metricValue: {
      fontFamily: typography.sans.bold,
      fontSize: 18,
      marginVertical: 2,
    },
    metricSub: {
      fontFamily: typography.sans.regular,
      fontSize: 10,
      color: colors.mutedForeground,
    },
    sectionHeaderWrap: {
      marginBottom: spacing.sm,
    },
    sectionTitle: {
      fontFamily: typography.mono.bold,
      fontSize: 11,
      color: colors.mutedForeground,
      letterSpacing: 0.8,
    },
    sectionSub: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    subjectPillsList: {
      paddingVertical: spacing.xs,
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    subjectPill: {
      width: 140,
      padding: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pillTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    pillCode: {
      fontFamily: typography.mono.medium,
      fontSize: 12,
      color: colors.foreground,
    },
    pillPctBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: radii.sm,
    },
    pillPctText: {
      fontFamily: typography.sans.bold,
      fontSize: 10,
    },
    pillName: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    sandboxCard: {
      padding: spacing.md,
      marginBottom: spacing.lg,
      backgroundColor: colors.card,
    },
    sandboxHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    sandboxCode: {
      fontFamily: typography.mono.bold,
      fontSize: 12,
      color: colors.primary,
    },
    sandboxName: {
      fontFamily: typography.sans.bold,
      fontSize: 16,
      color: colors.foreground,
      marginTop: 2,
    },
    sandboxHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    revertBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.sm,
      backgroundColor: colors.muted,
      gap: 4,
    },
    revertBtnText: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    impactBarContainer: {
      backgroundColor: colors.muted,
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.md,
    },
    impactNumbersRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    impactLabel: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    actualPctText: {
      fontFamily: typography.sans.bold,
      fontSize: 17,
      color: colors.foreground,
    },
    projectedPctText: {
      fontFamily: typography.sans.bold,
      fontSize: 18,
    },
    progressBarBg: {
      height: 8,
      backgroundColor: 'rgba(156, 163, 175, 0.25)',
      borderRadius: radii.full,
      position: 'relative',
      overflow: 'visible',
      marginTop: 4,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: radii.full,
    },
    marker75: {
      position: 'absolute',
      left: '75%',
      top: -3,
      bottom: -3,
      alignItems: 'center',
    },
    markerLine: {
      width: 2,
      height: 14,
      backgroundColor: colors.foreground,
    },
    markerText: {
      position: 'absolute',
      top: 16,
      fontFamily: typography.sans.medium,
      fontSize: 8,
      color: colors.mutedForeground,
      width: 60,
      textAlign: 'center',
    },
    steppersContainer: {
      flexDirection: Platform.OS === 'web' && isWide ? 'row' : 'column',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    stepperBlock: {
      flex: 1,
      backgroundColor: colors.muted,
      padding: spacing.sm,
      borderRadius: radii.md,
    },
    stepperHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    stepperTitle: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      color: colors.mutedForeground,
      letterSpacing: 0.5,
    },
    customInputLink: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.primary,
    },
    stepperControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginVertical: spacing.xs,
    },
    stepBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnDisabled: {
      opacity: 0.4,
    },
    stepValueBox: {
      alignItems: 'center',
    },
    stepValueText: {
      fontFamily: typography.sans.bold,
      fontSize: 18,
    },
    stepUnitText: {
      fontFamily: typography.sans.regular,
      fontSize: 10,
      color: colors.mutedForeground,
    },
    quickChipsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 4,
      marginTop: 6,
    },
    quickChip: {
      flex: 1,
      paddingVertical: 3,
      backgroundColor: colors.card,
      borderRadius: radii.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    quickChipText: {
      fontFamily: typography.sans.medium,
      fontSize: 10,
      color: colors.foreground,
    },
    metricsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: spacing.sm,
    },
    metricBox: {
      flex: 1,
      alignItems: 'center',
    },
    boxLabel: {
      fontFamily: typography.sans.regular,
      fontSize: 10,
      color: colors.mutedForeground,
    },
    boxVal: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.foreground,
      marginTop: 2,
    },
    boxValSub: {
      fontFamily: typography.sans.regular,
      fontSize: 10,
      color: colors.mutedForeground,
    },
    allSubjectsSection: {
      marginTop: spacing.sm,
    },
    courseRowCard: {
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radii.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    courseRowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    courseRowCode: {
      fontFamily: typography.mono.bold,
      fontSize: 12,
      color: colors.primary,
    },
    courseRowName: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.foreground,
      marginTop: 1,
    },
    courseRowPct: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
    },
    courseRowBuffer: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    miniProgressBg: {
      height: 4,
      backgroundColor: 'rgba(156, 163, 175, 0.2)',
      borderRadius: radii.full,
    },
    miniProgressFill: {
      height: '100%',
      borderRadius: radii.full,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      maxWidth: 360,
      padding: spacing.lg,
      backgroundColor: colors.card,
    },
    modalTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 16,
      color: colors.foreground,
      marginBottom: 4,
    },
    modalSub: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginBottom: spacing.md,
    },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 18,
      fontFamily: typography.sans.bold,
      color: colors.foreground,
      backgroundColor: colors.muted,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  });
};
