
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

  const projectedPercentage =
    projectedConducted > 0
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
  let riskLabel = '≥80%';
  if (projectedPercentage < 75) {
    riskTier = 'CRITICAL';
    riskLabel = '<75%';
  } else if (projectedPercentage < 80) {
    riskTier = 'CAUTION';
    riskLabel = '75-80%';
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
        text: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        bar: 'bg-rose-500',
        badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      };
    case 'CAUTION':
      return {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        bar: 'bg-amber-500',
        badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      };
    case 'SAFE':
    default:
      return {
        text: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        bar: 'bg-emerald-500',
        badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      };
  }
}
