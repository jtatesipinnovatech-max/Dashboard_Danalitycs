import { useCallback, useEffect, useState } from 'react';
import {
  SEED_ASSESSMENT,
  SEED_INITIATIVES,
  SEED_ISO_PRINCIPLES,
  SEED_METI_INDICATORS,
  SEED_RISKS,
} from '../data/governanceSeed';
import {
  fetchGovernanceFromSupabase,
  isSupabaseConfigured,
  updateInitiativeInSupabase,
  updateIsoPrincipleInSupabase,
  updateMetiIndicatorInSupabase,
} from '../lib/supabaseClient';
import type {
  GovernanceAssessment,
  Initiative,
  InitiativePriority,
  InitiativeStatus,
  IsoPrinciple,
  MetiIndicator,
  RiskItem,
} from '../types/governance';

const STORAGE_KEY = 'danalytics_iso38500_state_v1';

interface PersistedState {
  assessment: GovernanceAssessment;
  principles: IsoPrinciple[];
  indicators: MetiIndicator[];
  initiatives: Initiative[];
  risks: RiskItem[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (
        parsed.assessment &&
        Array.isArray(parsed.principles) &&
        parsed.principles.length === 6 &&
        Array.isArray(parsed.indicators) &&
        parsed.indicators.length === 10 &&
        Array.isArray(parsed.initiatives) &&
        parsed.initiatives.length === 12
      ) {
        return {
          assessment: parsed.assessment,
          principles: parsed.principles,
          indicators: parsed.indicators,
          initiatives: parsed.initiatives,
          risks: Array.isArray(parsed.risks) ? parsed.risks : SEED_RISKS,
        };
      }
    }
  } catch {
    // Fallback to seed on storage parse error
  }

  return {
    assessment: SEED_ASSESSMENT,
    principles: SEED_ISO_PRINCIPLES,
    indicators: SEED_METI_INDICATORS,
    initiatives: SEED_INITIATIVES,
    risks: SEED_RISKS,
  };
}

export function useGovernanceData() {
  const [state, setState] = useState<PersistedState>(() => loadInitialState());
  const [syncSource, setSyncSource] = useState<'local' | 'supabase'>(
    isSupabaseConfigured ? 'supabase' : 'local'
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    setIsSyncing(true);
    fetchGovernanceFromSupabase()
      .then((remote) => {
        if (!active || !remote) return;
        setState((prev) => ({
          ...prev,
          assessment: remote.assessment ?? prev.assessment,
          principles:
            remote.principles && remote.principles.length > 0
              ? remote.principles.map((rp) => {
                  const seedMatch = prev.principles.find((sp) => sp.code === rp.code);
                  return {
                    ...seedMatch,
                    ...rp,
                    target_score: seedMatch?.target_score ?? 4.5,
                    iso37000_outcome:
                      seedMatch?.iso37000_outcome ?? 'Rendimiento Efectivo',
                  } as IsoPrinciple;
                })
              : prev.principles,
          indicators:
            remote.indicators && remote.indicators.length > 0
              ? remote.indicators
              : prev.indicators,
          initiatives:
            remote.initiatives && remote.initiatives.length > 0
              ? remote.initiatives.map((ri) => {
                  const seedMatch = prev.initiatives.find((si) => si.code === ri.code);
                  return {
                    ...seedMatch,
                    ...ri,
                  } as Initiative;
                })
              : prev.initiatives,
        }));
        setSyncSource('supabase');
      })
      .catch(() => {
        if (active) setSyncSource('local');
      })
      .finally(() => {
        if (active) setIsSyncing(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const flashSaved = useCallback((msg: string) => {
    setLastSavedMessage(msg);
    window.setTimeout(() => {
      setLastSavedMessage((curr) => (curr === msg ? null : curr));
    }, 2800);
  }, []);

  const updatePrinciple = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<
          IsoPrinciple,
          | 'estimated_score'
          | 'confidence_level'
          | 'is_audited'
          | 'evidence'
          | 'gap_description'
          | 'recommendation'
        >
      >
    ) => {
      const now = new Date().toISOString();
      setState((prev) => {
        const nextPrinciples = prev.principles.map((p) =>
          p.id === id ? { ...p, ...updates, updated_at: now } : p
        );
        // Recalculate self-assessment percentage proportionally when principles change
        const totalEstimated = nextPrinciples.reduce(
          (sum, p) => sum + p.estimated_score,
          0
        );
        const baseTotal = SEED_ISO_PRINCIPLES.reduce(
          (sum, p) => sum + p.estimated_score,
          0
        );
        const adjustedScore =
          totalEstimated === baseTotal
            ? SEED_ASSESSMENT.self_assessment_score
            : Number(
                Math.min(
                  100,
                  Math.max(0, (totalEstimated / (nextPrinciples.length * 5)) * 100)
                ).toFixed(2)
              );

        return {
          ...prev,
          principles: nextPrinciples,
          assessment: {
            ...prev.assessment,
            self_assessment_score: adjustedScore,
          },
        };
      });

      if (isSupabaseConfigured) {
        try {
          await updateIsoPrincipleInSupabase(id, updates);
        } catch {
          // Local state stays responsive
        }
      }
      flashSaved('Principio ISO 38500 actualizado');
    },
    [flashSaved]
  );

  const updateMetiValue = useCallback(
    async (id: string, currentValue: number | null) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        indicators: prev.indicators.map((ind) =>
          ind.id === id ? { ...ind, current_value: currentValue, updated_at: now } : ind
        ),
      }));

      if (isSupabaseConfigured) {
        try {
          await updateMetiIndicatorInSupabase(id, currentValue);
        } catch {
          // Local state stays responsive
        }
      }
      flashSaved(
        currentValue === null
          ? 'Indicador marcado como Sin dato / Pendiente'
          : 'Medición PETI registrada'
      );
    },
    [flashSaved]
  );

  const updateInitiative = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Initiative, 'status' | 'priority'>>
    ) => {
      const now = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        initiatives: prev.initiatives.map((item) =>
          item.id === id ? { ...item, ...updates, updated_at: now } : item
        ),
      }));

      if (isSupabaseConfigured) {
        try {
          await updateInitiativeInSupabase(id, updates);
        } catch {
          // Local state stays responsive
        }
      }
      flashSaved('Iniciativa de portafolio actualizada');
    },
    [flashSaved]
  );

  const updateRiskStatus = useCallback(
    (id: string, status: RiskItem['status']) => {
      setState((prev) => ({
        ...prev,
        risks: prev.risks.map((r) => (r.id === id ? { ...r, status } : r)),
      }));
      flashSaved('Estado de riesgo actualizado');
    },
    [flashSaved]
  );

  const resetToSeed = useCallback(() => {
    const fresh: PersistedState = {
      assessment: SEED_ASSESSMENT,
      principles: SEED_ISO_PRINCIPLES,
      indicators: SEED_METI_INDICATORS,
      initiatives: SEED_INITIATIVES,
      risks: SEED_RISKS,
    };
    setState(fresh);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    flashSaved('Datos restaurados a línea base DAnalytics');
  }, [flashSaved]);

  return {
    assessment: state.assessment,
    principles: state.principles,
    indicators: state.indicators,
    initiatives: state.initiatives,
    risks: state.risks,
    syncSource,
    isSyncing,
    lastSavedMessage,
    updatePrinciple,
    updateMetiValue,
    updateInitiative: (
      id: string,
      updates: { status?: InitiativeStatus; priority?: InitiativePriority }
    ) => updateInitiative(id, updates),
    updateRiskStatus,
    resetToSeed,
  };
}
