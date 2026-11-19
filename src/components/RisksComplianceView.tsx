import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CloudCog,
  Cpu,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type {
  MetiIndicator,
  NavigationTab,
  RiskDomain,
  RiskItem,
} from '../types/governance';

interface RisksComplianceViewProps {
  risks: RiskItem[];
  indicators: MetiIndicator[];
  dataProtectionScore: number;
  onUpdateRiskStatus: (id: string, status: RiskItem['status']) => void;
  onNavigate: (tab: NavigationTab) => void;
}

const DOMAINS: ('Todos' | RiskDomain)[] = [
  'Todos',
  'Privacidad y Ley 1581',
  'Ciberseguridad',
  'Riesgos TI e IA',
  'FinOps Cloud',
];

export function RisksComplianceView({
  risks,
  indicators,
  dataProtectionScore,
  onUpdateRiskStatus,
  onNavigate,
}: RisksComplianceViewProps) {
  const [domainFilter, setDomainFilter] = useState<'Todos' | RiskDomain>('Todos');

  const filteredRisks = useMemo(() => {
    if (domainFilter === 'Todos') return risks;
    return risks.filter((r) => r.domain === domainFilter);
  }, [risks, domainFilter]);

  const meti01 = indicators.find((i) => i.code === 'METI01');
  const meti03 = indicators.find((i) => i.code === 'METI03');
  const meti04 = indicators.find((i) => i.code === 'METI04');
  const meti08 = indicators.find((i) => i.code === 'METI08');

  const severityBadgeClass = (severity: RiskItem['severity']) => {
    if (severity === 'Crítica') {
      return 'border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300';
    }
    if (severity === 'Alta') {
      return 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    }
    if (severity === 'Media') {
      return 'border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    }
    return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Custodia Responsable ISO 37000 · Conformidad ISO 38500
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Monitor de Riesgos, Seguridad, Privacidad y FinOps
          </h1>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {risks.filter((r) => r.status === 'Brecha Abierta').length} brechas abiertas ·{' '}
          {risks.filter((r) => r.status === 'En Mitigación').length} en mitigación
        </div>
      </div>

      {/* Alerta Crítica Ley 1581 */}
      <div className="rounded-xl border border-red-500/35 bg-red-500/5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <h2 className="text-sm font-semibold text-red-700 dark:text-red-300">
                Alerta Crítica: Protección de Datos y Ley 1581 (Puntaje {dataProtectionScore}/100 en base de datos)
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-red-700/90 dark:text-red-200/80 max-w-3xl">
                El diagnóstico inicial registró calificación cero en controles formales de protección de datos personales. Es prioritario validar la iniciativa B001 (Cumplimiento Ley 1581) y cerrar la brecha en METI03 antes de escalar pipelines productivos de IA con datos sensibles.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('portfolio')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-red-500 whitespace-nowrap shrink-0 self-start lg:self-auto"
          >
            <span>Priorizar B001 en Portafolio</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Dominios de Monitorización */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Privacidad · Ley 1581
            </span>
            <Lock className="h-4 w-4 text-[#FA5C7C]" />
          </div>
          <div className="mt-2.5 font-mono text-xl font-semibold text-[#FA5C7C] dark:text-red-400 tabular-nums">
            {dataProtectionScore}% cumplimiento
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Protocolo datos (METI03): {meti03?.current_value ?? 'Sin dato'}% / Meta {meti03?.year_1_target}%
          </p>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Ciberseguridad & Respaldo
            </span>
            <ShieldCheck className="h-4 w-4 text-[#2E93FA]" />
          </div>
          <div className="mt-2.5 font-mono text-xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
            {meti04?.current_value ?? '—'}% cifrado
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Meta Año 1 (METI04): {meti04?.year_1_target}% · Año 3: {meti04?.year_3_target}%
          </p>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Gobierno de IA en Nube Segura
            </span>
            <Cpu className="h-4 w-4 text-[#5F3DF5]" />
          </div>
          <div className="mt-2.5 font-mono text-xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
            {meti01?.current_value ?? '—'}% proyectos
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Meta Año 1 (METI01): {meti01?.year_1_target}% · Base {meti01?.baseline_value}%
          </p>
        </div>

        <div className="rounded-lg border border-slate-200/90 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              FinOps Cloud & Costos
            </span>
            <CloudCog className="h-4 w-4 text-[#44B7B2]" />
          </div>
          <div className="mt-2.5 font-mono text-xl font-semibold text-slate-900 dark:text-slate-50 tabular-nums">
            {meti08?.current_value ?? '—'}% ahorro
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Meta Año 1 (METI08): {meti08?.year_1_target}% · Año 3: {meti08?.year_3_target}%
          </p>
        </div>
      </div>

      {/* Filtro por Dominio + Registro de Riesgos */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Registro de Riesgos, Cumplimiento y Planes de Mitigación
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Trazabilidad directa entre riesgos normativos/técnicos, indicadores METI e iniciativas B001–B012
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80 self-start">
            {DOMAINS.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => setDomainFilter(domain)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  domainFilter === domain
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredRisks.map((risk) => (
            <div
              key={risk.id}
              className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start lg:justify-between"
            >
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {risk.code}
                  </span>
                  <span className="text-slate-400" aria-hidden="true">·</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {risk.domain}
                  </span>
                  <span className="text-slate-400" aria-hidden="true">·</span>
                  <span
                    className={`rounded border px-2 py-0.5 text-[11px] font-medium ${severityBadgeClass(
                      risk.severity
                    )}`}
                  >
                    Severidad {risk.severity}
                  </span>
                  <span className="text-slate-400" aria-hidden="true">·</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {risk.regulation_ref}
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {risk.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {risk.description}
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-medium">Plan de mitigación:</span>{' '}
                  {risk.mitigation_plan}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Iniciativa:{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate('portfolio')}
                      className="font-mono font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {risk.linked_initiative_code}
                    </button>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Indicador:{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate('meti')}
                      className="font-mono font-medium text-sky-600 hover:underline dark:text-sky-400"
                    >
                      {risk.linked_meti_code}
                    </button>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Responsable: {risk.owner}</span>
                </div>
              </div>

              <div className="flex flex-row items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-slate-800 lg:flex-col lg:items-end lg:border-t-0 lg:pt-0 shrink-0">
                <div className="text-left lg:text-right">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nivel de control actual
                  </div>
                  <div
                    className={`font-mono text-base font-semibold tabular-nums ${
                      risk.compliance_score === 0
                        ? 'text-red-600 dark:text-red-400'
                        : risk.compliance_score < 70
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {risk.compliance_score}%
                  </div>
                </div>

                <div>
                  <label className="sr-only">Estado de mitigación</label>
                  <select
                    value={risk.status}
                    onChange={(e) =>
                      onUpdateRiskStatus(
                        risk.id,
                        e.target.value as RiskItem['status']
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Brecha Abierta">Brecha Abierta</option>
                    <option value="En Mitigación">En Mitigación</option>
                    <option value="Controlado">Controlado</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
