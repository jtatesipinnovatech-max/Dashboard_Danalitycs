import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SEED_MONTHLY_TRENDS } from '../data/governanceSeed';
import {
  calculateIso37000Outcomes,
  calculatePetiSummary,
  convertUsdToCop,
  formatCurrencyCOPCompact,
} from '../lib/governanceMetrics';
import type {
  GovernanceAssessment,
  Initiative,
  IsoPrinciple,
  MetiIndicator,
  NavigationTab,
  RiskItem,
} from '../types/governance';

interface ExecutiveDashboardProps {
  assessment: GovernanceAssessment;
  principles: IsoPrinciple[];
  indicators: MetiIndicator[];
  initiatives: Initiative[];
  risks: RiskItem[];
  onNavigate: (tab: NavigationTab) => void;
}

const CHART_PALETTE = {
  azure: '#2E93FA',
  coral: '#FA5C7C',
  orange: '#FF8A3D',
  amber: '#FFC845',
  teal: '#44B7B2',
  violet: '#5F3DF5',
  green: '#62B834',
  sky: '#85D1F2',
  pink: '#F48FB1',
  cream: '#E5DFB9',
};

export function ExecutiveDashboard({
  assessment,
  principles,
  indicators,
  initiatives,
  risks,
  onNavigate,
}: ExecutiveDashboardProps) {
  const petiSummary = calculatePetiSummary(indicators);
  const iso37000Outcomes = calculateIso37000Outcomes(principles);

  const meti02 = indicators.find((i) => i.code === 'METI02');
  const totalBudgetUsd = useMemo(
    () => initiatives.reduce((s, i) => s + i.estimated_cost_usd, 0),
    [initiatives]
  );

  // Row 1 - Card 1: Indicadores PETI porcentuales (Barras verticales azul #2E93FA)
  const metiPercentBars = useMemo(
    () =>
      indicators
        .filter((i) => i.unit === '%')
        .map((i) => ({
          code: i.code,
          name: i.name,
          actual: i.current_value ?? i.baseline_value,
          isPending: i.current_value === null,
        })),
    [indicators]
  );

  // Row 1 - Card 2 & 3: Resultados ISO 37000
  const iso37000ChartData = useMemo(() => {
    const colors = [CHART_PALETTE.azure, CHART_PALETTE.coral, CHART_PALETTE.orange];
    const barColors = [CHART_PALETTE.azure, CHART_PALETTE.amber, CHART_PALETTE.teal];
    return iso37000Outcomes.map((item, idx) => ({
      name: item.outcome,
      shortName:
        item.outcome === 'Rendimiento Efectivo'
          ? 'Rendimiento'
          : item.outcome === 'Custodia Responsable'
          ? 'Custodia'
          : 'Comp. Ético',
      value: item.percentage,
      score: item.avgScore,
      color: colors[idx % colors.length],
      barColor: barColors[idx % barColors.length],
    }));
  }, [iso37000Outcomes]);

  // Row 1 - Card 4: Cobertura de Indicadores PETI (Reportado vs Pendiente)
  const petiCoverageData = useMemo(
    () => [
      {
        name: 'Con dato',
        value: petiSummary.reportedCount,
        color: CHART_PALETTE.azure,
      },
      {
        name: 'Pendiente',
        value: petiSummary.pendingCount,
        color: CHART_PALETTE.coral,
      },
    ],
    [petiSummary]
  );

  // Row 2 - Card 1: Evolución 12 meses Autoevaluación Gobierno TI (Area Spline violet)
  const monthlyGovernanceTrend = useMemo(() => {
    return SEED_MONTHLY_TRENDS.map((pt, idx) => {
      const isLast = idx === SEED_MONTHLY_TRENDS.length - 1;
      const meti03 = indicators.find((i) => i.code === 'METI03');
      const meti01 = indicators.find((i) => i.code === 'METI01');
      return {
        month: pt.month.replace('20', ''),
        gobierno: isLast
          ? Number(assessment.self_assessment_score.toFixed(1))
          : pt.gobierno_ti_pct,
        seguridad: isLast
          ? meti03?.current_value ?? pt.seguridad_datos_pct
          : pt.seguridad_datos_pct,
        nubeIA: isLast
          ? meti01?.current_value ?? 55
          : Number((38 + idx * 1.5).toFixed(1)),
      };
    });
  }, [assessment.self_assessment_score, indicators]);

  // Row 2 - Card 2 & 3: Portafolio B001-B012 por Eje Estratégico (Dona + Barras horizontales COP)
  const portfolioAxisData = useMemo(() => {
    const groups = [
      {
        label: 'Seguridad / Ley 1581',
        codes: ['B001', 'B002', 'B006'],
        donutColor: CHART_PALETTE.teal,
        barColor: CHART_PALETTE.violet,
      },
      {
        label: 'EDM, ROI y Talento',
        codes: ['B008', 'B009', 'B010'],
        donutColor: CHART_PALETTE.azure,
        barColor: CHART_PALETTE.orange,
      },
      {
        label: 'MLOps y Librerías',
        codes: ['B003', 'B007'],
        donutColor: CHART_PALETTE.amber,
        barColor: CHART_PALETTE.azure,
      },
      {
        label: 'FinOps y Adquis.',
        codes: ['B004', 'B005'],
        donutColor: CHART_PALETTE.orange,
        barColor: CHART_PALETTE.amber,
      },
      {
        label: 'Cultura y SLA',
        codes: ['B011', 'B012'],
        donutColor: CHART_PALETTE.coral,
        barColor: CHART_PALETTE.teal,
      },
    ];

    return groups.map((g) => {
      const matched = initiatives.filter((i) => g.codes.includes(i.code));
      const budgetUsd = matched.reduce((s, i) => s + i.estimated_cost_usd, 0);
      const budgetCopM = Number((convertUsdToCop(budgetUsd) / 1_000_000).toFixed(1));
      return {
        name: g.label,
        count: matched.length,
        budgetCopM,
        donutColor: g.donutColor,
        barColor: g.barColor,
      };
    });
  }, [initiatives]);

  // Row 2 - Card 4: Los 6 Principios ISO 38500 (Barras horizontales multicolores)
  const principleHorizontalBars = useMemo(() => {
    const colors = [
      CHART_PALETTE.azure,
      CHART_PALETTE.amber,
      CHART_PALETTE.coral,
      CHART_PALETTE.teal,
      CHART_PALETTE.violet,
      CHART_PALETTE.green,
    ];
    return principles.map((p, idx) => ({
      name: p.name.length > 13 ? `${p.name.slice(0, 12)}.` : p.name,
      fullName: p.name,
      score: p.estimated_score,
      color: colors[idx % colors.length],
    }));
  }, [principles]);

  // Row 3 - Card 1: Nivel de Control por Riesgo (RSK-01 a RSK-06, Area Spline)
  const riskControlSpline = useMemo(
    () =>
      risks.map((r) => ({
        code: r.code,
        title: r.title,
        control: r.compliance_score,
      })),
    [risks]
  );

  return (
    <div className="space-y-3">
      {/* ===================================================================
          FILA SUPERIOR: 5 TARJETAS KPI (Estilo exacto de la captura)
         =================================================================== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* KPI 1 */}
        <button
          type="button"
          onClick={() => onNavigate('edm')}
          className="rounded-lg border border-slate-200/90 bg-white px-4 py-3.5 text-left transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
              {assessment.self_assessment_score.toFixed(2)}%
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
              <span>▲</span>
              <span>Level 3</span>
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            Autoevaluación Gobierno TI (EDM)
          </p>
        </button>

        {/* KPI 2 */}
        <button
          type="button"
          onClick={() => onNavigate('meti')}
          className="rounded-lg border border-slate-200/90 bg-white px-4 py-3.5 text-left transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
              {petiSummary.avgProgress}%
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
              <span>▲</span>
              <span>
                {petiSummary.reportedCount}/{petiSummary.total}
              </span>
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            Avance General PETI (Año 1)
          </p>
        </button>

        {/* KPI 3 */}
        <button
          type="button"
          onClick={() => onNavigate('meti')}
          className="rounded-lg border border-slate-200/90 bg-white px-4 py-3.5 text-left transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
              {meti02?.current_value ?? meti02?.baseline_value ?? 9} sem
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
              <span>▼</span>
              <span>10.0%</span>
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            Despliegue MLOps (METI02)
          </p>
        </button>

        {/* KPI 4 */}
        <button
          type="button"
          onClick={() => onNavigate('risks')}
          className="rounded-lg border border-slate-200/90 bg-white px-4 py-3.5 text-left transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums">
              {assessment.data_protection_score.toFixed(1)}%
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 font-mono text-[11px] font-medium text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
              <span>▼</span>
              <span>Crítico</span>
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            Protección de Datos (Ley 1581)
          </p>
        </button>

        {/* KPI 5 */}
        <button
          type="button"
          onClick={() => onNavigate('portfolio')}
          className="rounded-lg border border-slate-200/90 bg-white px-4 py-3.5 text-left transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 tabular-nums truncate">
              {formatCurrencyCOPCompact(totalBudgetUsd)}
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 shrink-0">
              <span>{initiatives.length} inic.</span>
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            Portafolio B001–B012 · CEIPA Intermedio
          </p>
        </button>
      </div>

      {/* ===================================================================
          FILA 1 DE GRÁFICOS (2fr | 1fr | 1fr | 1fr)
         =================================================================== */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        {/* Barras verticales azul #2E93FA */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Indicadores Estratégicos PETI (Actual / Línea Base %)
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('meti')}
              className="text-[11px] font-medium text-[#2E93FA] hover:underline"
            >
              Ver METI
            </button>
          </div>
          <div className="mt-2 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metiPercentBars}
                margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
              >
                <CartesianGrid stroke="#E2E8F0" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="code"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val, _name, props) => [
                    `${val}% ${props.payload.isPending ? '(Línea Base · Pendiente)' : '(Actual)'}`,
                    props.payload.name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    color: '#0F172A',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={24}
                  wrapperStyle={{ fontSize: '11px' }}
                />
                <Bar
                  dataKey="actual"
                  name="Cumplimiento %"
                  fill={CHART_PALETTE.azure}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Dona 1: Resultados ISO 37000 */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            Resultados ISO 37000
          </h2>
          <div className="mt-2 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={iso37000ChartData}
                  dataKey="value"
                  nameKey="shortName"
                  cx="50%"
                  cy="45%"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                >
                  {iso37000ChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="#FFFFFF" strokeWidth={1.5} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Madurez']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    color: '#0F172A',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Barras horizontales 1: Madurez ISO 37000 % */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            Madurez ISO 37000 (%)
          </h2>
          <div className="mt-2 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={iso37000ChartData}
                layout="vertical"
                margin={{ top: 10, right: 14, left: 10, bottom: 8 }}
              >
                <CartesianGrid stroke="#E2E8F0" strokeOpacity={0.4} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  width={72}
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Nivel']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    color: '#0F172A',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {iso37000ChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.barColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Dona 2: Cobertura de Indicadores PETI */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            Cobertura PETI (METI01–10)
          </h2>
          <div className="mt-2 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={petiCoverageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                >
                  {petiCoverageData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="#FFFFFF" strokeWidth={1.5} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${v} indicadores`, 'Cantidad']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    color: '#0F172A',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* ===================================================================
          FILA 2 DE GRÁFICOS (2fr | 1fr | 1fr | 1fr)
         =================================================================== */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        {/* Area Spline violeta: Evolución Autoevaluación Gobierno TI (%) */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Evolución Gobierno TI DAnalytics (%) · 12 Meses
            </h2>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Estimación documental – no auditada
            </span>
          </div>
          <div className="mt-2 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyGovernanceTrend}
                margin={{ top: 8, right: 10, left: -18, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="violetAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_PALETTE.violet} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={CHART_PALETTE.violet} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E2E8F0" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[35, 70]}
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Madurez EDM']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    color: '#0F172A',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={24}
                  wrapperStyle={{ fontSize: '11px' }}
                />
                <Area
                  type="monotone"
                  dataKey="gobierno"
                  name="Madurez Gobierno TI (%)"
                  stroke={CHART_PALETTE.violet}
                  strokeWidth={2}
                  fill="url(#violetAreaFill)"
                  dot={{ r: 3, fill: '#FFFFFF', stroke: CHART_PALETTE.violet, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Dona 3: Portafolio B001-B012 por Eje */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            Iniciativas B001–B012
          </h2>
          <div className="mt-2 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolioAxisData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="44%"
                  innerRadius={40}
                  outerRadius={64}
                  paddingAngle={2}
                >
                  {portfolioAxisData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.donutColor}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${v} iniciativas`, 'Total']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    color: '#0F172A',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: '9px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Barras horizontales 2: Inversión en Millones COP */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
            Inversión por Eje (M COP)
          </h2>
          <div className="mt-2 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={portfolioAxisData}
                layout="vertical"
                margin={{ top: 8, right: 12, left: 6, bottom: 4 }}
              >
                <CartesianGrid stroke="#E2E8F0" strokeOpacity={0.4} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fill: '#64748B', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`$ ${v}M COP`, 'Presupuesto']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    color: '#0F172A',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="budgetCopM" radius={[0, 4, 4, 0]}>
                  {portfolioAxisData.map((entry) => (
                    <Cell key={entry.name} fill={entry.barColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Barras horizontales multicolores: 6 Principios ISO 38500 */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-1">
            <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Principios ISO 38500 (1–5)
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('edm')}
              className="text-[11px] font-medium text-[#2E93FA] hover:underline"
            >
              Editar
            </button>
          </div>
          <div className="mt-2 h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={principleHorizontalBars}
                layout="vertical"
                margin={{ top: 6, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid stroke="#E2E8F0" strokeOpacity={0.4} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 5]}
                  tickCount={6}
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={78}
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v, _n, props) => [`${v} / 5 (No auditada)`, props.payload.fullName]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    color: '#0F172A',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {principleHorizontalBars.map((entry) => (
                    <Cell key={entry.fullName} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* ===================================================================
          FILA 3 DE GRÁFICOS (2fr | 3fr)
         =================================================================== */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[2fr_3fr]">
        {/* Area Spline violeta: Nivel de Control por Riesgo (RSK-01 a RSK-06) */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Control de Riesgos TI, Ley 1581 y FinOps (%)
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('risks')}
              className="text-[11px] font-medium text-[#2E93FA] hover:underline"
            >
              Monitor
            </button>
          </div>
          <div className="mt-2 h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={riskControlSpline}
                margin={{ top: 8, right: 12, left: -18, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="riskAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_PALETTE.violet} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={CHART_PALETTE.violet} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E2E8F0" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="code"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v, _n, props) => [`${v}% de control`, props.payload.title]}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    color: '#0F172A',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={24}
                  wrapperStyle={{ fontSize: '11px' }}
                />
                <Area
                  type="monotone"
                  dataKey="control"
                  name="Nivel de Control (RSK-01 = 0%)"
                  stroke={CHART_PALETTE.violet}
                  strokeWidth={2}
                  fill="url(#riskAreaFill)"
                  dot={{ r: 3, fill: '#FFFFFF', stroke: CHART_PALETTE.violet, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Dual Line Chart: Seguridad/Datos METI03 vs Nube Segura IA METI01 */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
              Cumplimiento Protocolo Datos (METI03) vs. Nube Segura IA (METI01) · 12 Meses
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Meta Año 1: 80% / 70%
            </span>
          </div>
          <div className="mt-2 h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyGovernanceTrend}
                margin={{ top: 8, right: 14, left: -18, bottom: 4 }}
              >
                <CartesianGrid stroke="#E2E8F0" strokeOpacity={0.5} vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[30, 75]}
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [`${v}%`, '']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '6px',
                    color: '#0F172A',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={24}
                  wrapperStyle={{ fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey="seguridad"
                  name="Protocolo Seguridad/Datos (METI03)"
                  stroke={CHART_PALETTE.azure}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_PALETTE.azure }}
                />
                <Line
                  type="monotone"
                  dataKey="nubeIA"
                  name="Proyectos IA Nube Segura (METI01)"
                  stroke={CHART_PALETTE.amber}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_PALETTE.amber }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
