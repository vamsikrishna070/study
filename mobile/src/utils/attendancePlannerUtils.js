/**
 * Pure calculation utilities for Attendance Planner and Bunk Simulations
 */

export function calculateSimulation({
  conducted = 0,
  attended = 0,
  odMlPct = 0,
  simulatedBunks = 0,
  simulatedAttended = 0,
}) {
  const c = Math.max(0, Number(conducted) || 0);
  const p = Math.max(0, Number(attended) || 0);
  const odRate = Math.max(0, Number(odMlPct) || 0) / 100;
  const b = Math.max(0, Number(simulatedBunks) || 0);
  const a = Math.max(0, Number(simulatedAttended) || 0);

  const projectedConducted = c + b + a;
  const projectedAttended = p + a;
  const odCredit = odRate * projectedConducted;
  const projectedEffectiveAttended = projectedAttended + odCredit;

  const projectedPercentage = projectedConducted > 0
    ? parseFloat(((projectedEffectiveAttended / projectedConducted) * 100).toFixed(2))
    : 0;

  // Safe bunks remaining before dipping below 75%
  const remaining = Math.floor(
    (0.25 * projectedConducted - (projectedConducted - projectedEffectiveAttended)) / 0.75
  );
  const safeBunksRemaining = Math.max(0, remaining);

  // Recovery classes needed to reach 75%
  let recoveryClassesNeeded = 0;
  if (projectedPercentage < 75 && projectedConducted > 0) {
    const needed = Math.ceil(
      (0.75 * projectedConducted - projectedEffectiveAttended) / (0.25 + odRate)
    );
    recoveryClassesNeeded = Math.max(0, needed);
  }

  let riskTier = 'SAFE';
  let riskLabel = 'Safe (≥80%)';
  if (projectedPercentage < 75) {
    riskTier = 'CRITICAL';
    riskLabel = 'At Risk (<75%)';
  } else if (projectedPercentage < 80) {
    riskTier = 'CAUTION';
    riskLabel = 'Caution (75-80%)';
  }

  return {
    projectedConducted,
    projectedAttended,
    projectedAbsences: projectedConducted - projectedAttended,
    projectedPercentage,
    safeBunksRemaining,
    recoveryClassesNeeded,
    riskTier,
    riskLabel,
    hasSimulations: b > 0 || a > 0,
  };
}

export function getRiskColor(riskTier) {
  switch (riskTier) {
    case 'CRITICAL':
      return {
        text: '#EF4444',
        bg: '#FEF2F2',
        border: '#FCA5A5',
        badgeBg: 'rgba(239, 68, 68, 0.12)',
        badgeText: '#DC2626',
      };
    case 'CAUTION':
      return {
        text: '#F59E0B',
        bg: '#FFFBEB',
        border: '#FCD34D',
        badgeBg: 'rgba(245, 158, 11, 0.12)',
        badgeText: '#D97706',
      };
    case 'SAFE':
    default:
      return {
        text: '#10B981',
        bg: '#ECFDF5',
        border: '#6EE7B7',
        badgeBg: 'rgba(16, 185, 129, 0.12)',
        badgeText: '#059669',
      };
  }
}
