import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  GovernanceAssessment,
  Initiative,
  IsoPrinciple,
  MetiIndicator,
} from '../types/governance';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project.supabase.co') &&
    !supabaseAnonKey.includes('your-anon-key')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export interface GovernanceSnapshot {
  assessment: GovernanceAssessment;
  principles: IsoPrinciple[];
  indicators: MetiIndicator[];
  initiatives: Initiative[];
}

export async function fetchGovernanceFromSupabase(): Promise<Partial<GovernanceSnapshot> | null> {
  if (!supabase) return null;

  const [assessmentRes, principlesRes, metiRes, initiativesRes] = await Promise.all([
    supabase.from('governance_assessments').select('*').limit(1).maybeSingle(),
    supabase.from('iso_principles').select('*').order('code', { ascending: true }),
    supabase.from('meti_indicators').select('*').order('code', { ascending: true }),
    supabase.from('initiatives_portfolio').select('*').order('code', { ascending: true }),
  ]);

  if (
    assessmentRes.error ||
    principlesRes.error ||
    metiRes.error ||
    initiativesRes.error
  ) {
    throw new Error(
      assessmentRes.error?.message ||
        principlesRes.error?.message ||
        metiRes.error?.message ||
        initiativesRes.error?.message ||
        'Error al consultar Supabase'
    );
  }

  return {
    assessment: assessmentRes.data ?? undefined,
    principles: principlesRes.data ?? undefined,
    indicators: metiRes.data ?? undefined,
    initiatives: initiativesRes.data ?? undefined,
  };
}

export async function updateIsoPrincipleInSupabase(
  id: string,
  payload: Partial<
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
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('iso_principles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateMetiIndicatorInSupabase(
  id: string,
  currentValue: number | null
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('meti_indicators')
    .update({ current_value: currentValue, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateInitiativeInSupabase(
  id: string,
  payload: Partial<Pick<Initiative, 'status' | 'priority'>>
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('initiatives_portfolio')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
