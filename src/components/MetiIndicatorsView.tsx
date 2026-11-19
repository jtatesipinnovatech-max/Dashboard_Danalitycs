import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Edit3,
  LineChart as LineChartIcon,
  Search,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { evaluateMetiIndicator } from '../lib/governanceMetrics';
import type {
  MetiDirection,
  MetiFrequency,
  MetiIndicator,
} from '../types/governance';

interface MetiIndicatorsViewProps {
  indicators: MetiIndicator[];
  onUpdateMetiValue: (id: string, currentValue: number | null) => void;
}

export function MetiIndicatorsView({
  indicators,
  onUpdateMetiValue,
}: MetiIndicatorsViewProps) {
  const [search, setSearch] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState<'Todas' | MetiFrequency>('Todas');
  const [directionFilter, setDirectionFilter] = useState<'Todas' | MetiDirection>('Todas');
  const [roleFilter, setRoleFilter] = useState<string>('Todos');
  const [chartMode, setChartMode] = useState<'bar' | 'line'>('bar');
  const [selectedMetiCode, setSelectedMetiCode] = useState<string>('METI02');

  const [editingMeti, setEditingMeti] = useState<MetiIndicator | null>(null);
  const [inputValue, setInputValue] = useState<string>('');

  const roles = useMemo(
    () => ['Todos', ...Array.from(new Set(indicators.map((i) => i.responsible_role)))],
    [indicators]
  );

  const filtered = useMemo(() => {
    return indicators.filter((ind) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        ind.code.toLowerCase().includes(q) ||
        ind.name.toLowerCase().includes(q) ||
        ind.responsible_role.toLowerCase().includes(q);
      const matchesFreq =
        frequencyFilter === 'Todas' || ind.frequency === frequencyFilter;
      const matchesDir =
        directionFilter === 'Todas' || ind.direction === directionFilter;
      const matchesRole =
        roleFilter === 'Todos' || ind.responsible_role === roleFilter;
      return matchesSearch && matchesFreq && matchesDir && matchesRole;
    });
  }, [indicators, search, frequencyFilter, directionFilter, roleFilter]);

  const barChartData = useMemo(
    () =>
      filtered
        .filter((i) => i.unit === '%')
        .map((i) => ({
          code: i.code,
          name: i.name,
          Base: i.baseline_value,
          Actual: i.current_value ?? undefined,
          Año1: i.year_1_target,
          Año2: i.year_2_target,
          Año3: i.year_3_target,
        })),
    [filtered]
  );

  const selectedIndicator =
    indicators.find((i) => i.code === selectedMetiCode) ?? indicators[0];

  const lineChartData = useMemo(() => {
    if (!selectedIndicator) return [];
    return [
      {
        stage: 'Línea Base',
        Meta: selectedIndicator.baseline_value,
        Actual: selectedIndicator.baseline_value,
      },
      {
        stage: 'Año 1',
        Meta: selectedIndicator.year_1_target,
        Actual:
          selectedIndicator.current_value !== null
            ? selectedIndicator.current_value
            : null,
      },
      {
        stage: 'Año 2',
        Meta: selectedIndicator.year_2_target,
        Actual: null,
      },
      {
        stage: 'Año 3',
        Meta: selectedIndicator.year_3_target,
        Actual: null,
      },
    ];
  }, [selectedIndicator]);

  const openEditor = (ind: MetiIndicator) => {
    setEditingMeti(ind);
    setInputValue(ind.current_value !== null ? String(ind.current_value) : '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeti) return;
    if (inputValue.trim() === '') {
      onUpdateMetiValue(editingMeti.id, null);
    } else {
      const parsed = Number(inputValue);
      if (!Number.isNaN(parsed)) {
        onUpdateMetiValue(editingMeti.id, parsed);
      }
    }
    setEditingMeti(null);
  };

  const handleSetPending = () => {
    if (!editingMeti) return;
    onUpdateMetiValue(editingMeti.id, null);
    setEditingMeti(null);
  };

  const pendingCount = indicators.filter((i) => i.current_value === null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Plan Estratégico de TI (PETI) · DAnalytics
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Indicadores Estratégicos PETI (METI01–METI10)
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span>
            <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {indicators.length - pendingCount}/{indicators.length}
            </strong>{' '}
            con medición
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {pendingCount}
            </strong>{' '}
            Sin dato / Pendiente
          </span>
        </div>
      </div>

      {/* Gráfico Comparativo Bar / Line */}
      <div className="rounded-md border border-slate-200 border-t-[3px] border-t-[#36B37E] bg-white p-6 shadow-xs dark:border-slate-800 dark:border-t-[#36B37E] dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {chartMode === 'bar'
                ? 'Comparativa Línea Base vs. Metas Año 1–Año 3 (Indicadores en %)'
                : `Trayectoria de Cumplimiento: ${selectedIndicator.code} · ${selectedIndicator.name}`}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {chartMode === 'bar'
                ? 'Nota: METI02 (semanas) se visualiza en escala nativa dentro de «Trayectoria Individual»'
                : `Unidad: ${selectedIndicator.unit} · Dirección: ${
                    selectedIndicator.direction === 'lower_is_better'
                      ? 'Menor es mejor (semáforo invertido)'
                      : 'Mayor es mejor'
                  }`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {chartMode === 'line' && (
              <select
                value={selectedMetiCode}
                onChange={(e) => setSelectedMetiCode(e.target.value)}
                aria-label="Seleccionar indicador para trayectoria"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {indicators.map((ind) => (
                  <option key={ind.id} value={ind.code}>
                    {ind.code} · {ind.name}
                  </option>
                ))}
              </select>
            )}

            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setChartMode('bar')}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  chartMode === 'bar'
                    ? 'bg-[#0052CC] text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Comparativa (%)</span>
              </button>
              <button
                type="button"
                onClick={() => setChartMode('line')}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  chartMode === 'line'
                    ? 'bg-[#0052CC] text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <LineChartIcon className="h-3.5 w-3.5" />
                <span>Trayectoria Individual</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 h-[290px] w-full">
          {chartMode === 'bar' ? (
            barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} barGap={2}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    strokeOpacity={0.25}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="code"
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Base" name="Línea Base" fill="#64748B" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Actual" name="Valor Actual" fill="#10B981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Año1" name="Meta Año 1" fill="#0EA5E9" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Año2" name="Meta Año 2" fill="#6366F1" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Año3" name="Meta Año 3" fill="#4338CA" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                No hay indicadores porcentuales que coincidan con los filtros seleccionados.
              </div>
            )
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  strokeOpacity={0.25}
                  vertical={false}
                />
                <XAxis
                  dataKey="stage"
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [
                    `${value} ${selectedIndicator.unit}`,
                    '',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Meta"
                  name="Trayectoria Objetivo"
                  stroke="#0EA5E9"
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="Actual"
                  name="Lectura Actual"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  connectNulls={false}
                  dot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filtros + Tabla METI */}
      <div className="rounded-md border border-slate-200 border-t-[3px] border-t-[#0052CC] bg-white shadow-xs dark:border-slate-800 dark:border-t-[#0052CC] dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, nombre o rol..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={frequencyFilter}
              onChange={(e) =>
                setFrequencyFilter(e.target.value as 'Todas' | MetiFrequency)
              }
              aria-label="Filtrar por frecuencia"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="Todas">Frecuencia: Todas</option>
              <option value="Mensual">Mensual</option>
              <option value="Trimestral">Trimestral</option>
              <option value="Semestral">Semestral</option>
              <option value="Anual">Anual</option>
            </select>

            <select
              value={directionFilter}
              onChange={(e) =>
                setDirectionFilter(e.target.value as 'Todas' | MetiDirection)
              }
              aria-label="Filtrar por dirección"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="Todas">Dirección: Todas</option>
              <option value="higher_is_better">Mayor es mejor</option>
              <option value="lower_is_better">Menor es mejor</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filtrar por rol responsable"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 max-w-[220px]"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r === 'Todos' ? 'Rol: Todos' : r}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-6 py-3">Indicador</th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3 text-right">Base</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3 text-right">Año 1</th>
                <th className="px-4 py-3 text-right">Año 2</th>
                <th className="px-4 py-3 text-right">Año 3</th>
                <th className="px-4 py-3">Semáforo</th>
                <th className="px-4 py-3">Frecuencia / Rol</th>
                <th className="px-6 py-3 text-right">Medición</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-10 text-center text-xs text-slate-500 dark:text-slate-400"
                  >
                    No se encontraron indicadores PETI con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filtered.map((ind) => {
                  const evaluation = evaluateMetiIndicator(ind);

                  return (
                    <tr
                      key={ind.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-6 py-3.5">
                        <div className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {ind.code}
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-900 dark:text-slate-100">
                          {ind.name}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                          {ind.direction === 'lower_is_better' ? (
                            <>
                              <ArrowDownRight className="h-3.5 w-3.5 text-sky-500" />
                              <span>Menor es mejor</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Mayor es mejor</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {ind.baseline_value} {ind.unit}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                        {ind.current_value !== null ? (
                          `${ind.current_value} ${ind.unit}`
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-xs text-sky-600 dark:text-sky-400 tabular-nums whitespace-nowrap">
                        {ind.year_1_target} {ind.unit}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-indigo-600 dark:text-indigo-400 tabular-nums whitespace-nowrap">
                        {ind.year_2_target} {ind.unit}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {ind.year_3_target} {ind.unit}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {evaluation.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>Sin dato / Pendiente</span>
                          </span>
                        )}
                        {evaluation.status === 'optimal' && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            <span>{evaluation.label}</span>
                          </span>
                        )}
                        {evaluation.status === 'warning' && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{evaluation.label}</span>
                          </span>
                        )}
                        {evaluation.status === 'critical' && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{evaluation.label}</span>
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {ind.frequency}
                        </div>
                        <div className="truncate max-w-[180px]" title={ind.responsible_role}>
                          {ind.responsible_role}
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditor(ind)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Registrar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para actualizar valor actual */}
      {editingMeti && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-meti-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {editingMeti.code} · {editingMeti.frequency}
                </span>
                <h3
                  id="edit-meti-title"
                  className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-50"
                >
                  {editingMeti.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMeti(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-xs dark:border-slate-800 dark:bg-slate-950/50">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Línea Base</span>
                  <div className="mt-0.5 font-mono font-semibold text-slate-800 dark:text-slate-100">
                    {editingMeti.baseline_value} {editingMeti.unit}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Meta Año 1</span>
                  <div className="mt-0.5 font-mono font-semibold text-sky-600 dark:text-sky-400">
                    {editingMeti.year_1_target} {editingMeti.unit}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Meta Año 3</span>
                  <div className="mt-0.5 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {editingMeti.year_3_target} {editingMeti.unit}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Valor Actual ({editingMeti.unit})
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Dejar vacío para Sin dato / Pendiente"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {editingMeti.direction === 'lower_is_better'
                    ? 'Lógica invertida activa: valores menores o iguales a Meta Año 1 son Óptimos.'
                    : 'Valores mayores o iguales a Meta Año 1 son Óptimos.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleSetPending}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                >
                  Marcar Sin dato
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingMeti(null)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                  >
                    Guardar lectura
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
