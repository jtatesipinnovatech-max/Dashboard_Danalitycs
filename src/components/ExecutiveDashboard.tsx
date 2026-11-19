import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Maximize2,
  Radar as RadarIcon,
  Search,
  BarChart3,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SEED_MONTHLY_TRENDS } from '../data/governanceSeed';
import {
  calculateIso37000Outcomes,
  calculatePetiSummary,
  evaluateMetiIndicator,
  formatCurrencyUSD,
} from '../lib/governanceMetrics';
import type {
  GovernanceAssessment,
  Initiative,
  IsoPrinciple,
  MetiIndicator,
  NavigationTab,
} from '../types/governance';

interface ExecutiveDashboardProps {
  assessment: GovernanceAssessment;
  principles: IsoPrinciple[];
  indicators: MetiIndicator[];
  initiatives: Initiative[];
  onNavigate: (tab: NavigationTab) => void;
}

type SearchDomain = 'Todos' | 'Principios' | 'Indicadores' | 'Iniciativas';
type SearchStatus = 'Todos' | 'Por validar' | 'Pendiente' | 'Crítico';
type SearchPriority = 'Todas' | 'Alta' | 'Media' | 'Baja';

export function ExecutiveDashboard({
  assessment,
  principles,
  indicators,
  initiatives,
  onNavigate,
}: ExecutiveDashboardProps) {
  // Widget 1: Simple Search state
  const [domainFilter, setDomainFilter] = useState<SearchDomain>('Todos');
  const [statusFilter, setStatusFilter] = useState<SearchStatus>('Todos');
  const [priorityFilter, setPriorityFilter] = useState<SearchPriority>('Todas');
  const [queryText, setQueryText] = useState('');
  const [showNoteExpanded, setShowNoteExpanded] = useState(false);

  // Widget 3: Toggle between Stacked Bar (%) and Radar ISO 38500
  const [centerChartMode, setCenterChartMode] = useState<'stacked' | 'radar'>('stacked');

  const petiSummary = calculatePetiSummary(indicators);
  const iso37000Outcomes = calculateIso37000Outcomes(principles);

  // Live trend points (last point dynamically reflects current self_assessment_score)
  const monthlyTrendData = useMemo(() => {
    return SEED_MONTHLY_TRENDS.map((point, idx) => {
      if (idx === SEED_MONTHLY_TRENDS.length - 1) {
        const meti03 = indicators.find((i) => i.code === 'METI03');
        const meti08 = indicators.find((i) => i.code === 'METI08');
        return {
          ...point,
          gobierno_ti_pct: Number(assessment.self_assessment_score.toFixed(1)),
          seguridad_datos_pct: meti03?.current_value ?? point.seguridad_datos_pct,
          finops_ahorro_pct: meti08?.current_value ?? point.finops_ahorro_pct,
        };
      }
      return point;
    });
  }, [assessment.self_assessment_score, indicators]);

  // Stacked Bar data for ISO 38500 Principles (scaled to 100%)
  const stackedPrincipleData = useMemo(() => {
    return principles.map((p) => {
      const actualPct = Math.round((p.estimated_score / 5) * 100);
      const targetPct = Math.round((p.target_score / 5) * 100);
      const gapToTarget = Math.max(0, targetPct - actualPct);
      const remainingTop = Math.max(0, 100 - actualPct - gapToTarget);
      return {
        code: p.code,
        name: p.name,
        actualPct,
        gapToTarget,
        remainingTop,
        scoreLabel: `${actualPct}%`,
      };
    });
  }, [principles]);

  const radarData = useMemo(
    () =>
      principles.map((p) => ({
        subject: p.code,
        fullName: p.name,
        actual: Math.round((p.estimated_score / 5) * 100),
        meta: Math.round((p.target_score / 5) * 100),
      })),
    [principles]
  );

  // Widget 1: Unified live search across 28 governance items (6 principles + 10 METI + 12 initiatives)
  const unifiedMatches = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    const items: {
      id: string;
      code: string;
      title: string;
      type: Exclude<SearchDomain, 'Todos'>;
      statusTag: string;
      targetTab: NavigationTab;
    }[] = [];

    if (domainFilter === 'Todos' || domainFilter === 'Principios') {
      principles.forEach((p) => {
        const isCritical = p.estimated_score <= 2;
        const matchesStatus =
          statusFilter === 'Todos' ||
          (statusFilter === 'Pendiente' && !p.is_audited) ||
          (statusFilter === 'Crítico' && isCritical);
        const matchesPriority =
          priorityFilter === 'Todas' ||
          (priorityFilter === 'Alta' && isCritical) ||
          (priorityFilter === 'Media' && p.estimated_score === 3);
        const matchesText =
          !q ||
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.gap_description.toLowerCase().includes(q);
        if (matchesStatus && matchesPriority && matchesText) {
          items.push({
            id: p.id,
            code: p.code,
            title: `${p.name} (${p.estimated_score}/5 · ${Math.round((p.estimated_score / 5) * 100)}%)`,
            type: 'Principios',
            statusTag: p.is_audited ? 'Auditada' : 'No auditada',
            targetTab: 'edm',
          });
        }
      });
    }

    if (domainFilter === 'Todos' || domainFilter === 'Indicadores') {
      indicators.forEach((ind) => {
        const evalRes = evaluateMetiIndicator(ind);
        const matchesStatus =
          statusFilter === 'Todos' ||
          (statusFilter === 'Pendiente' && evalRes.status === 'pending') ||
          (statusFilter === 'Crítico' && evalRes.status === 'critical');
        const matchesPriority =
          priorityFilter === 'Todas' ||
          (priorityFilter === 'Alta' && evalRes.status !== 'optimal');
        const matchesText =
          !q ||
          ind.code.toLowerCase().includes(q) ||
          ind.name.toLowerCase().includes(q) ||
          ind.responsible_role.toLowerCase().includes(q);
        if (matchesStatus && matchesPriority && matchesText) {
          items.push({
            id: ind.id,
            code: ind.code,
            title: `${ind.name} (${
              ind.current_value !== null
                ? `${ind.current_value}${ind.unit === '%' ? '%' : ` ${ind.unit}`}`
                : 'Sin dato'
            })`,
            type: 'Indicadores',
            statusTag: evalRes.label,
            targetTab: 'meti',
          });
        }
      });
    }

    if (domainFilter === 'Todos' || domainFilter === 'Iniciativas') {
      initiatives.forEach((init) => {
        const matchesStatus =
          statusFilter === 'Todos' ||
          (statusFilter === 'Por validar' && init.status === 'Por validar') ||
          (statusFilter === 'Crítico' && init.priority === 'Alta');
        const matchesPriority =
          priorityFilter === 'Todas' || init.priority === priorityFilter;
        const matchesText =
          !q ||
          init.code.toLowerCase().includes(q) ||
          init.title.toLowerCase().includes(q) ||
          init.related_objective.toLowerCase().includes(q);
        if (matchesStatus && matchesPriority && matchesText) {
          items.push({
            id: init.id,
            code: init.code,
            title: init.title,
            type: 'Iniciativas',
            statusTag: init.status,
            targetTab: 'portfolio',
          });
        }
      });
    }

    return items;
  }, [
    domainFilter,
    statusFilter,
    priorityFilter,
    queryText,
    principles,
    indicators,
    initiatives,
  ]);

  // Widget 6: Portfolio distribution funnel (grounded in B001–B012)
  const portfolioFunnel = useMemo(() => {
    const groups = [
      {
        label: 'Seguridad y Ley 1581',
        codes: ['B001', 'B002', 'B006'],
        color: '#36B37E',
      },
      {
        label: 'MLOps y Librerías IA',
        codes: ['B003', 'B007'],
        color: '#00C7E6',
      },
      {
        label: 'Gobierno EDM, ROI y Talento',
        codes: ['B008', 'B009', 'B010'],
        color: '#5243AA',
      },
      {
        label: 'FinOps y Adquisiciones',
        codes: ['B004', 'B005'],
        color: '#FFAB00',
      },
      {
        label: 'Cultura Ética y SLA',
        codes: ['B011', 'B012'],
        color: '#DE350B',
      },
    ];

    const totalCount = initiatives.length || 12;
    const totalBudget = initiatives.reduce((s, i) => s + i.estimated_cost_usd, 0);

    return {
      totalCount,
      totalBudget,
      rows: groups.map((g) => {
        const matched = initiatives.filter((i) => g.codes.includes(i.code));
        const count = matched.length;
        const budget = matched.reduce((s, i) => s + i.estimated_cost_usd, 0);
        const pct = Number(((count / totalCount) * 100).toFixed(1));
        return {
          ...g,
          count,
          budget,
          pct,
          widthPct: Math.max(22, Math.round((count / 3) * 100)),
        };
      }),
    };
  }, [initiatives]);

  const totalIsoScore = principles.reduce((s, p) => s + p.estimated_score, 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* ===================================================================
          COLUMNA IZQUIERDA (4 cols): Búsqueda Rápida + Evolución 12 Meses
         =================================================================== */}
      <div className="flex flex-col gap-4 lg:col-span-4">
        {/* WIDGET 1: Búsqueda Rápida Gobierno TI (Top bar Coral/Red) */}
        <section className="rounded-md border border-slate-200 border-t-[3px] border-t-[#DE350B] bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-[#DE350B] dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2 pb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <GripVertical className="h-3.5 w-3.5 text-slate-400" />
              <span>Búsqueda Rápida · DAnalytics</span>
            </div>
            <button
              type="button"
              onClick={() =>
                onNavigate(
                  domainFilter === 'Principios'
                    ? 'edm'
                    : domainFilter === 'Indicadores'
                    ? 'meti'
                    : 'portfolio'
                )
              }
              title="Abrir vista completa"
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Filter Pills / Selects matching screenshot */}
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value as SearchDomain)}
              aria-label="Filtrar dominio"
              className="rounded bg-[#403294] px-2.5 py-1.5 text-xs font-medium text-white focus:outline-none"
            >
              <option value="Todos">DAnalytics (Todos)</option>
              <option value="Principios">Principios ISO (6)</option>
              <option value="Indicadores">Indicadores METI (10)</option>
              <option value="Iniciativas">Portafolio B001–B012</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SearchStatus)}
              aria-label="Filtrar estado"
              className="rounded border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="Todos">Estado: Todos</option>
              <option value="Por validar">Por validar</option>
              <option value="Pendiente">Pendiente / No auditado</option>
              <option value="Crítico">Brecha Crítica</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as SearchPriority)}
              aria-label="Filtrar prioridad"
              className="rounded border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="Todas">Prioridad: Todas</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Contiene texto (ej. Ley 1581, MLOps, METI02)..."
                className="w-full rounded border border-slate-300 bg-white py-1.5 pl-8 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0052CC] focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (unifiedMatches[0]) {
                  onNavigate(unifiedMatches[0].targetTab);
                }
              }}
              className="rounded bg-[#0052CC] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0747A6] whitespace-nowrap shrink-0"
            >
              Ir al primero
            </button>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#36B37E]" />
              <span>
                <strong className="font-mono text-[#0052CC] dark:text-sky-400 tabular-nums">
                  {unifiedMatches.length}
                </strong>{' '}
                elementos encontrados
              </span>
            </span>
            {(queryText || domainFilter !== 'Todos' || statusFilter !== 'Todos' || priorityFilter !== 'Todas') && (
              <button
                type="button"
                onClick={() => {
                  setDomainFilter('Todos');
                  setStatusFilter('Todos');
                  setPriorityFilter('Todas');
                  setQueryText('');
                }}
                className="text-[11px] font-medium text-[#0052CC] hover:underline dark:text-sky-400"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Lista compacta de resultados (máx 3 visibles para mantener densidad tipo Jira) */}
          {(queryText || domainFilter !== 'Todos' || statusFilter !== 'Todos' || priorityFilter !== 'Todas') && (
            <div className="mt-2.5 divide-y divide-slate-100 rounded border border-slate-200 bg-slate-50/70 dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-950/40">
              {unifiedMatches.slice(0, 3).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onNavigate(m.targetTab)}
                  className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800/70"
                >
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    <strong className="font-mono text-[#0052CC] dark:text-sky-400">
                      {m.code}
                    </strong>{' '}
                    · {m.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                    {m.statusTag}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* WIDGET 2: Evolución Mensual - Últimos 12 Meses (Top bar Emerald) */}
        <section className="flex flex-1 flex-col justify-between rounded-md border border-slate-200 border-t-[3px] border-t-[#36B37E] bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-[#36B37E] dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                <span>Evolución Estudio DAnalytics</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('meti')}
                title="Ver indicadores PETI"
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <h2 className="mt-1 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
              Progreso de Madurez y Controles (%) - 12 Meses
            </h2>

            <div className="mt-2 h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyTrendData}
                  margin={{ top: 18, right: 12, left: -16, bottom: 8 }}
                >
                  <CartesianGrid
                    stroke="#E2E8F0"
                    strokeOpacity={0.6}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    angle={-32}
                    textAnchor="end"
                    height={46}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 75]}
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, '']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '6px',
                      color: '#0F172A',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="seguridad_datos_pct"
                    name="Seguridad/Datos (METI03)"
                    stroke="#36B37E"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#FFFFFF', stroke: '#36B37E', strokeWidth: 2 }}
                  >
                    <LabelList
                      dataKey="seguridad_datos_pct"
                      position="top"
                      formatter={(v) => `${v}`}
                      style={{ fill: '#334155', fontSize: 9, fontWeight: 600 }}
                    />
                  </Line>
                  <Line
                    type="monotone"
                    dataKey="gobierno_ti_pct"
                    name="Autoevaluación Gobierno TI"
                    stroke="#FFAB00"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#FFFFFF', stroke: '#FFAB00', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="finops_ahorro_pct"
                    name="Ahorro FinOps (METI08)"
                    stroke="#5243AA"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: '#FFFFFF', stroke: '#5243AA', strokeWidth: 2 }}
                  >
                    <LabelList
                      dataKey="finops_ahorro_pct"
                      position="top"
                      formatter={(v) => `${v}`}
                      style={{ fill: '#334155', fontSize: 9, fontWeight: 600 }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#36B37E]" />
                METI03 ({monthlyTrendData[11]?.seguridad_datos_pct}%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#FFAB00]" />
                Gobierno TI ({assessment.self_assessment_score.toFixed(1)}%)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#5243AA]" />
                FinOps ({monthlyTrendData[11]?.finops_ahorro_pct}%)
              </span>
            </div>
          </div>

          {/* Nota metodológica desplegable estilo Custom Charts */}
          <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowNoteExpanded((v) => !v)}
              className="flex w-full items-center gap-1.5 text-left text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {showNoteExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>Haz clic para ver notas metodológicas del estudio DAnalytics...</span>
            </button>
            {showNoteExpanded ? (
              <p className="mt-1.5 pl-5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                Serie calibrada sobre datos reales de línea base y avance actual: Autoevaluación{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {assessment.self_assessment_score}% ({assessment.assessment_level})
                </strong>
                , Madurez CEIPA{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {assessment.digital_maturity_ceipa}
                </strong>
                . Principios ISO 38500 marcados como{' '}
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  Estimación documental – no auditada
                </span>
                .
              </p>
            ) : (
              <p className="mt-1 pl-5 text-[11px] text-slate-500 dark:text-slate-400">
                Base semi-sintética 12m con cierre real: <span className="text-[#0052CC] dark:text-sky-400 font-medium">61.29% EDM</span> ·{' '}
                <span className="text-[#DE350B] font-medium">0% Protección Datos</span> ·{' '}
                <span className="text-[#36B37E] font-medium">Estimación documental – no auditada</span>
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ===================================================================
          COLUMNA CENTRAL (4 cols): Barras Apiladas ISO 38500 + 3 Tiles Clave
         =================================================================== */}
      <div className="flex flex-col gap-4 lg:col-span-4">
        {/* WIDGET 3: Principios ISO 38500 (Top bar Amber) */}
        <section className="flex flex-1 flex-col justify-between rounded-md border border-slate-200 border-t-[3px] border-t-[#FFAB00] bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-[#FFAB00] dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                <span>Principios ISO/IEC 38500</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setCenterChartMode((m) =>
                      m === 'stacked' ? 'radar' : 'stacked'
                    )
                  }
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  title="Alternar vista Barras / Radar"
                >
                  {centerChartMode === 'stacked' ? (
                    <>
                      <RadarIcon className="h-3 w-3" />
                      <span>Radar</span>
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-3 w-3" />
                      <span>Barras</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('edm')}
                  title="Editar principios en Ciclo EDM"
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <h2 className="mt-1 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
              {centerChartMode === 'stacked'
                ? 'Nivel Actual vs. Brecha Meta por Principio (%)'
                : 'Radar ISO/IEC 38500 vs. Meta Deseada (%)'}
            </h2>

            <div className="mt-2 h-[250px] w-full">
              {centerChartMode === 'stacked' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stackedPrincipleData}
                    margin={{ top: 20, right: 8, left: -16, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke="#E2E8F0"
                      strokeOpacity={0.5}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="code"
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#64748B', fontSize: 10 }}
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      formatter={(value, name) => [`${value}%`, String(name)]}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#CBD5E1',
                        borderRadius: '6px',
                        color: '#0F172A',
                        fontSize: '12px',
                      }}
                    />
                    <Bar
                      dataKey="actualPct"
                      name="Nivel Actual"
                      stackId="iso"
                      fill="#FFAB00"
                    />
                    <Bar
                      dataKey="gapToTarget"
                      name="Brecha a Meta"
                      stackId="iso"
                      fill="#403294"
                    />
                    <Bar
                      dataKey="remainingTop"
                      name="Margen Excelencia"
                      stackId="iso"
                      fill="#00C7E6"
                      radius={[3, 3, 0, 0]}
                    >
                      <LabelList
                        dataKey="scoreLabel"
                        position="top"
                        style={{ fill: '#0F172A', fontSize: 11, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                    <PolarGrid stroke="#CBD5E1" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fill: '#64748B', fontSize: 9 }}
                    />
                    <Radar
                      name="Meta Deseada (%)"
                      dataKey="meta"
                      stroke="#00C7E6"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fill="#00C7E6"
                      fillOpacity={0.12}
                    />
                    <Radar
                      name="Nivel Actual (%)"
                      dataKey="actual"
                      stroke="#403294"
                      strokeWidth={2.5}
                      fill="#403294"
                      fillOpacity={0.28}
                    />
                    <Tooltip
                      formatter={(v) => [`${v}%`, '']}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#CBD5E1',
                        borderRadius: '6px',
                        color: '#0F172A',
                        fontSize: '12px',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] dark:border-slate-800">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#FFAB00]" />
                Actual
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#403294]" />
                Brecha Meta
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#00C7E6]" />
                Excelencia
              </span>
            </div>
            <span className="font-medium text-amber-700 dark:text-amber-400">
              Estimación documental – no auditada
            </span>
          </div>
        </section>

        {/* WIDGET 4: 3 Tarjetas Contorneadas de Madurez (Top bar Cyan) */}
        <section className="rounded-md border border-slate-200 border-t-[3px] border-t-[#00C7E6] bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-[#00C7E6] dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <GripVertical className="h-3.5 w-3.5 text-slate-400" />
              <span>Indicadores Clave DAnalytics</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('risks')}
              title="Abrir Monitor de Riesgos y Ley 1581"
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <h2 className="mt-1 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
            Madurez de Gobierno, PETI y Protección de Datos
          </h2>

          {/* 3 Outlined Metric Tiles matching App Hosting in screenshot */}
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('edm')}
              className="rounded-xl border-[2.5px] border-[#00C7E6] bg-white px-2 py-3 text-center transition-transform hover:-translate-y-0.5 dark:bg-slate-950/50"
            >
              <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                Gobierno TI
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-[#0052CC] dark:text-sky-400 tabular-nums">
                {assessment.self_assessment_score.toFixed(1)}%
              </div>
              <div className="mt-0.5 font-mono text-[11px] font-medium text-[#0052CC] dark:text-sky-400">
                Level 3 EDM
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('meti')}
              className="rounded-xl border-[2.5px] border-[#FFAB00] bg-white px-2 py-3 text-center transition-transform hover:-translate-y-0.5 dark:bg-slate-950/50"
            >
              <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                Avance PETI
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-[#0052CC] dark:text-amber-400 tabular-nums">
                {petiSummary.avgProgress}%
              </div>
              <div className="mt-0.5 font-mono text-[11px] font-medium text-[#0052CC] dark:text-amber-400">
                {petiSummary.reportedCount}/{petiSummary.total} con dato
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('risks')}
              className="rounded-xl border-[2.5px] border-[#DE350B] bg-white px-2 py-3 text-center transition-transform hover:-translate-y-0.5 dark:bg-slate-950/50"
            >
              <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">
                Prot. Datos
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-[#DE350B] dark:text-red-400 tabular-nums">
                {assessment.data_protection_score.toFixed(1)}%
              </div>
              <div className="mt-0.5 font-mono text-[11px] font-medium text-[#DE350B] dark:text-red-400">
                Ley 1581
              </div>
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] text-slate-600 dark:text-slate-400">
            CEIPA: <strong className="text-slate-800 dark:text-slate-200">{assessment.digital_maturity_ceipa}</strong> ·{' '}
            Pendientes PETI: <strong className="font-mono text-[#0052CC] dark:text-sky-400">{petiSummary.pendingCount}</strong> ·{' '}
            Iniciativas: <strong className="font-mono text-[#0052CC] dark:text-sky-400">{initiatives.length}</strong>
          </p>
        </section>
      </div>

      {/* ===================================================================
          COLUMNA DERECHA (4 cols): Dona ISO 37000 + Embudo Portafolio B001–B012
         =================================================================== */}
      <div className="flex flex-col gap-4 lg:col-span-4">
        {/* WIDGET 5: Dona Resultados ISO 37000 + Tabla (Top bar Indigo) */}
        <section className="rounded-md border border-slate-200 border-t-[3px] border-t-[#5243AA] bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-[#5243AA] dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <GripVertical className="h-3.5 w-3.5 text-slate-400" />
              <span>Gobernanza ISO 37000</span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('edm')}
              title="Ver detalle ISO 37000"
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <h2 className="mt-1 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
            Resultados ISO 37000 · Distribución de Madurez
          </h2>

          <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
            <div className="h-[168px] sm:col-span-5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={iso37000Outcomes}
                    dataKey="percentage"
                    nameKey="outcome"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={64}
                    paddingAngle={2}
                  >
                    {iso37000Outcomes.map((entry, idx) => {
                      const palette = ['#403294', '#FFAB00', '#36B37E'];
                      return (
                        <Cell
                          key={entry.outcome}
                          fill={palette[idx % palette.length]}
                          stroke="none"
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Nivel']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#CBD5E1',
                      borderRadius: '6px',
                      color: '#0F172A',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="sm:col-span-7">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="pb-1.5 text-left font-medium">Resultado</th>
                    <th className="pb-1.5 text-right font-medium">Nota</th>
                    <th className="pb-1.5 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {iso37000Outcomes.map((item, idx) => {
                    const palette = ['#403294', '#FFAB00', '#36B37E'];
                    return (
                      <tr key={item.outcome}>
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: palette[idx % palette.length] }}
                            />
                            <span className="text-slate-700 dark:text-slate-200 truncate">
                              {item.outcome}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 text-right font-mono font-medium text-[#0052CC] dark:text-sky-400 tabular-nums whitespace-nowrap">
                          {item.avgScore.toFixed(1)}/5
                        </td>
                        <td className="py-2 pl-2 text-right font-mono font-medium text-[#0052CC] dark:text-sky-400 tabular-nums whitespace-nowrap">
                          {item.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-slate-300 font-semibold dark:border-slate-700">
                    <td className="pt-2 text-slate-800 dark:text-slate-100">
                      Autoevaluación
                    </td>
                    <td className="pt-2 text-right font-mono text-[#0052CC] dark:text-sky-400 tabular-nums">
                      {totalIsoScore}/30
                    </td>
                    <td className="pt-2 pl-2 text-right font-mono text-[#0052CC] dark:text-sky-400 tabular-nums">
                      {assessment.self_assessment_score.toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* WIDGET 6: Embudo Horizontal Portafolio B001-B012 + Tabla (Top bar Cobalt Blue) */}
        <section className="flex flex-1 flex-col justify-between rounded-md border border-slate-200 border-t-[3px] border-t-[#0052CC] bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-[#0052CC] dark:bg-slate-900">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                <span>Portafolio de Brechas</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('portfolio')}
                title="Abrir Portafolio B001–B012"
                className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <h2 className="mt-1 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
              Iniciativas B001–B012 - Eje Estratégico
            </h2>

            <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-12">
              {/* Embudo centrado estilo Request Type */}
              <div className="flex flex-col items-center justify-center py-2 sm:col-span-5">
                {portfolioFunnel.rows.map((row, idx) => (
                  <div
                    key={row.label}
                    className="flex w-full flex-col items-center"
                  >
                    {idx > 0 && (
                      <div
                        className="h-2.5 w-[2px]"
                        style={{ backgroundColor: row.color }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigate('portfolio')}
                      title={`${row.label}: ${row.count} iniciativas (${formatCurrencyUSD(row.budget)} USD)`}
                      className="h-7 rounded transition-opacity hover:opacity-85"
                      style={{
                        width: `${row.widthPct}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Tabla alineada derecha */}
              <div className="sm:col-span-7">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="pb-1.5 text-left font-medium">Eje</th>
                      <th className="pb-1.5 text-right font-medium">Inic.</th>
                      <th className="pb-1.5 text-right font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {portfolioFunnel.rows.map((row) => (
                      <tr
                        key={row.label}
                        onClick={() => onNavigate('portfolio')}
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: row.color }}
                            />
                            <span className="text-slate-700 dark:text-slate-200 truncate max-w-[125px]">
                              {row.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 text-right font-mono font-medium text-[#0052CC] dark:text-sky-400 tabular-nums">
                          {row.count}
                        </td>
                        <td className="py-1.5 pl-2 text-right font-mono font-medium text-[#0052CC] dark:text-sky-400 tabular-nums">
                          {row.pct}%
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-300 font-semibold dark:border-slate-700">
                      <td className="pt-2 text-slate-800 dark:text-slate-100">
                        Total ({formatCurrencyUSD(portfolioFunnel.totalBudget)})
                      </td>
                      <td className="pt-2 text-right font-mono text-[#0052CC] dark:text-sky-400 tabular-nums">
                        {portfolioFunnel.totalCount}
                      </td>
                      <td className="pt-2 pl-2 text-right font-mono text-[#0052CC] dark:text-sky-400 tabular-nums">
                        100%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
