import type {
  Iso37000Outcome,
  IsoPrinciple,
  MetiIndicator,
} from '../types/governance';

export type MetiHealthStatus = 'optimal' | 'warning' | 'critical' | 'pending';

export interface MetiEvaluation {
  status: MetiHealthStatus;
  label: string;
  progressPct: number | null;
}

export function evaluateMetiIndicator(indicator: MetiIndicator): MetiEvaluation {
  const { current_value, baseline_value, year_1_target, direction } = indicator;

  if (current_value === null || current_value === undefined) {
    return {
      status: 'pending',
      label: 'Sin dato / Pendiente',
      progressPct: null,
    };
  }

  if (direction === 'lower_is_better') {
    const span = baseline_value - year_1_target;
    const achieved = baseline_value - current_value;
    const rawPct = span !== 0 ? (achieved / span) * 100 : 100;
    const progressPct = Math.max(0, Math.min(125, Math.round(rawPct)));

    if (current_value <= year_1_target) {
      return { status: 'optimal', label: 'En meta Año 1', progressPct };
    }
    if (current_value <= baseline_value) {
      return { status: 'warning', label: 'En progreso', progressPct };
    }
    return { status: 'critical', label: 'Sobre línea base', progressPct };
  }

  // higher_is_better
  const span = year_1_target - baseline_value;
  const achieved = current_value - baseline_value;
  const rawPct = span !== 0 ? (achieved / span) * 100 : 100;
  const progressPct = Math.max(0, Math.min(125, Math.round(rawPct)));

  if (current_value >= year_1_target) {
    return { status: 'optimal', label: 'En meta Año 1', progressPct };
  }
  if (current_value >= baseline_value) {
    return { status: 'warning', label: 'En progreso', progressPct };
  }
  return { status: 'critical', label: 'Bajo línea base', progressPct };
}

export function calculatePetiSummary(indicators: MetiIndicator[]) {
  const evaluated = indicators.map((ind) => ({
    indicator: ind,
    eval: evaluateMetiIndicator(ind),
  }));

  const reported = evaluated.filter((item) => item.eval.progressPct !== null);
  const pendingCount = indicators.length - reported.length;
  const optimalCount = evaluated.filter((item) => item.eval.status === 'optimal').length;
  const warningCount = evaluated.filter((item) => item.eval.status === 'warning').length;
  const criticalCount = evaluated.filter((item) => item.eval.status === 'critical').length;

  const avgProgress =
    reported.length > 0
      ? Math.round(
          reported.reduce((sum, item) => sum + (item.eval.progressPct ?? 0), 0) /
            reported.length
        )
      : 0;

  return {
    total: indicators.length,
    reportedCount: reported.length,
    pendingCount,
    optimalCount,
    warningCount,
    criticalCount,
    avgProgress,
  };
}

export interface Iso37000OutcomeStat {
  outcome: Iso37000Outcome;
  avgScore: number; // 0 - 5
  percentage: number; // 0 - 100
  principles: string[];
  color: string;
}

export function calculateIso37000Outcomes(
  principles: IsoPrinciple[]
): Iso37000OutcomeStat[] {
  const definitions: {
    outcome: Iso37000Outcome;
    color: string;
  }[] = [
    { outcome: 'Rendimiento Efectivo', color: '#6366F1' },
    { outcome: 'Custodia Responsable', color: '#0EA5E9' },
    { outcome: 'Comportamiento Ético', color: '#10B981' },
  ];

  return definitions.map(({ outcome, color }) => {
    const group = principles.filter((p) => p.iso37000_outcome === outcome);
    const avgScore =
      group.length > 0
        ? Number(
            (
              group.reduce((acc, p) => acc + p.estimated_score, 0) / group.length
            ).toFixed(2)
          )
        : 0;
    const percentage = Math.round((avgScore / 5) * 100);
    return {
      outcome,
      avgScore,
      percentage,
      principles: group.map((p) => p.name),
      color,
    };
  });
}

export function formatCurrencyUSD(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
