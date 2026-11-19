export type ConfidenceLevel = 'Alta' | 'Media' | 'Baja';
export type MetiDirection = 'higher_is_better' | 'lower_is_better';
export type MetiFrequency = 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';
export type InitiativePriority = 'Alta' | 'Media' | 'Baja';
export type InitiativeStatus =
  | 'Por validar'
  | 'En Planificación'
  | 'En Ejecución'
  | 'Completado';

export type Iso37000Outcome =
  | 'Rendimiento Efectivo'
  | 'Custodia Responsable'
  | 'Comportamiento Ético';

export type EdmStage = 'Evaluar' | 'Dirigir' | 'Monitorear';

export type NavigationTab =
  | 'executive'
  | 'edm'
  | 'meti'
  | 'portfolio'
  | 'risks';

export interface GovernanceAssessment {
  id: string;
  organization_name: string;
  assessment_level: string;
  self_assessment_score: number;
  digital_maturity_ceipa: string;
  data_protection_score: number;
  created_at: string;
}

export interface IsoPrinciple {
  id: string;
  code: 'RESP' | 'ESTR' | 'ADQ' | 'DES' | 'CONF' | 'COMP';
  name: string;
  estimated_score: number;
  target_score: number;
  iso37000_outcome: Iso37000Outcome;
  evidence: string;
  gap_description: string;
  recommendation: string;
  confidence_level: ConfidenceLevel;
  is_audited: boolean;
  updated_at: string;
}

export interface MetiIndicator {
  id: string;
  code: string;
  name: string;
  baseline_value: number;
  year_1_target: number;
  year_2_target: number;
  year_3_target: number;
  current_value: number | null;
  unit: string;
  direction: MetiDirection;
  frequency: MetiFrequency;
  responsible_role: string;
  updated_at: string;
}

export interface Initiative {
  id: string;
  code: string;
  title: string;
  related_objective: string;
  estimated_cost_usd: number;
  duration_months: number;
  priority: InitiativePriority;
  status: InitiativeStatus;
  feasibility: number; // 1 - 5
  urgency: number; // 1 - 5
  potential: number; // 1 - 5
  owner_role: string;
  updated_at: string;
}

export interface EdmActionItem {
  id: string;
  stage: EdmStage;
  code: string;
  title: string;
  description: string;
  linked_principles: IsoPrinciple['code'][];
  decision_criteria: string;
  cadence: string;
  owner: string;
}

export type RiskDomain =
  | 'Privacidad y Ley 1581'
  | 'Ciberseguridad'
  | 'Riesgos TI e IA'
  | 'FinOps Cloud';

export type RiskSeverity = 'Crítica' | 'Alta' | 'Media' | 'Baja';

export interface RiskItem {
  id: string;
  code: string;
  domain: RiskDomain;
  title: string;
  description: string;
  severity: RiskSeverity;
  compliance_score: number; // 0 - 100
  regulation_ref: string;
  mitigation_plan: string;
  linked_initiative_code: string;
  linked_meti_code: string;
  owner: string;
  status: 'Brecha Abierta' | 'En Mitigación' | 'Controlado';
}

export interface GovernanceTrendPoint {
  month: string;
  gobierno_ti_pct: number;
  seguridad_datos_pct: number;
  finops_ahorro_pct: number;
}

