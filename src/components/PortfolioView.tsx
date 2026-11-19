import { useMemo, useState } from 'react';
import {
  Grid3X3,
  Kanban,
  Table as TableIcon,
} from 'lucide-react';
import { formatCurrencyUSD } from '../lib/governanceMetrics';
import type {
  Initiative,
  InitiativePriority,
  InitiativeStatus,
} from '../types/governance';

interface PortfolioViewProps {
  initiatives: Initiative[];
  onUpdateInitiative: (
    id: string,
    updates: { status?: InitiativeStatus; priority?: InitiativePriority }
  ) => void;
}

const STATUSES: InitiativeStatus[] = [
  'Por validar',
  'En Planificación',
  'En Ejecución',
  'Completado',
];

const PRIORITIES: InitiativePriority[] = ['Alta', 'Media', 'Baja'];

export function PortfolioView({
  initiatives,
  onUpdateInitiative,
}: PortfolioViewProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'heatmap'>('kanban');
  const [priorityFilter, setPriorityFilter] = useState<'Todas' | InitiativePriority>('Todas');
  const [selectedInitiative, setSelectedInitiative] = useState<Initiative>(
    initiatives[0]
  );

  const filtered = useMemo(() => {
    return initiatives.filter(
      (i) => priorityFilter === 'Todas' || i.priority === priorityFilter
    );
  }, [initiatives, priorityFilter]);

  const totalCost = useMemo(
    () => filtered.reduce((sum, i) => sum + i.estimated_cost_usd, 0),
    [filtered]
  );

  const avgDuration = useMemo(() => {
    if (filtered.length === 0) return '0';
    return (
      filtered.reduce((sum, i) => sum + i.duration_months, 0) / filtered.length
    ).toFixed(1);
  }, [filtered]);

  const priorityBadgeClass = (priority: InitiativePriority) => {
    if (priority === 'Alta') {
      return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
    }
    if (priority === 'Media') {
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    }
    return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  const statusBadgeClass = (status: InitiativeStatus) => {
    if (status === 'Completado') {
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    }
    if (status === 'En Ejecución') {
      return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    }
    if (status === 'En Planificación') {
      return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300';
    }
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  };

  // Heatmap cell intensity helper (Urgency 1..5, Feasibility 1..5)
  const getCellTone = (urgency: number, feasibility: number) => {
    const score = urgency + feasibility;
    if (score >= 8) {
      return 'bg-indigo-500/20 border-indigo-500/35 dark:bg-indigo-500/20';
    }
    if (score >= 6) {
      return 'bg-sky-500/10 border-sky-500/25 dark:bg-sky-500/15';
    }
    return 'bg-slate-100/70 border-slate-200 dark:bg-slate-900/60 dark:border-slate-800';
  };

  const activeSelected =
    initiatives.find((i) => i.id === selectedInitiative?.id) ?? initiatives[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Cierre de Brechas ISO 38500 & PETI · DAnalytics
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Portafolio de Iniciativas (B001–B012) y Priorización
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Inversión estimada:{' '}
            <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatCurrencyUSD(totalCost)} USD
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Duración media:{' '}
            <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {avgDuration} meses
            </strong>
          </span>
        </div>
      </div>

      {/* Controles de vista y filtros */}
      <div className="flex flex-col gap-3 rounded-md border border-slate-200 border-t-[3px] border-t-[#0052CC] bg-white p-4 shadow-xs dark:border-slate-800 dark:border-t-[#0052CC] dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded bg-slate-100 p-1 dark:bg-slate-800/80 self-start">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'kanban'
                ? 'bg-[#0052CC] text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Tablero Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'table'
                ? 'bg-[#0052CC] text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <TableIcon className="h-3.5 w-3.5" />
            <span>Tabla Detallada</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('heatmap')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'heatmap'
                ? 'bg-[#0052CC] text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            <Grid3X3 className="h-3.5 w-3.5" />
            <span>Matriz Heatmap</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Prioridad:
          </span>
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80">
            {(['Todas', ...PRIORITIES] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  priorityFilter === p
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vista Kanban */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((status) => {
            const items = filtered.filter((i) => i.status === status);
            const columnCost = items.reduce(
              (sum, i) => sum + i.estimated_cost_usd,
              0
            );

            return (
              <div
                key={status}
                className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {status}
                    </h2>
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {formatCurrencyUSD(columnCost)}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                    {items.length}
                  </span>
                </div>

                <div className="mt-3 space-y-3">
                  {items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Sin iniciativas en este estado
                    </div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {item.code}
                          </span>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${priorityBadgeClass(
                              item.priority
                            )}`}
                          >
                            {item.priority}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-xs font-semibold leading-snug text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                          {item.related_objective}
                        </p>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] font-mono tabular-nums text-slate-600 dark:border-slate-800 dark:text-slate-300">
                          <span>{formatCurrencyUSD(item.estimated_cost_usd)}</span>
                          <span>{item.duration_months} meses</span>
                        </div>

                        <div className="mt-2.5">
                          <label className="sr-only">Cambiar estado</label>
                          <select
                            value={item.status}
                            onChange={(e) =>
                              onUpdateInitiative(item.id, {
                                status: e.target.value as InitiativeStatus,
                              })
                            }
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            {STATUSES.map((st) => (
                              <option key={st} value={st}>
                                Estado: {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vista Tabla */}
      {viewMode === 'table' && (
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-6 py-3">Iniciativa</th>
                  <th className="px-4 py-3">Objetivo Relacionado</th>
                  <th className="px-4 py-3 text-right">Costo Est.</th>
                  <th className="px-4 py-3 text-right">Duración</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-3.5 align-top">
                      <div className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {item.code}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-slate-900 dark:text-slate-100 max-w-xs">
                        {item.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.owner_role}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs text-slate-600 dark:text-slate-300 max-w-sm">
                      {item.related_objective}
                    </td>
                    <td className="px-4 py-3.5 align-top text-right font-mono text-xs font-medium text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
                      {formatCurrencyUSD(item.estimated_cost_usd)}
                    </td>
                    <td className="px-4 py-3.5 align-top text-right font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {item.duration_months} meses
                    </td>
                    <td className="px-4 py-3.5 align-top whitespace-nowrap">
                      <select
                        value={item.priority}
                        onChange={(e) =>
                          onUpdateInitiative(item.id, {
                            priority: e.target.value as InitiativePriority,
                          })
                        }
                        aria-label={`Prioridad de ${item.code}`}
                        className={`rounded-md border px-2 py-1 text-xs font-medium focus:outline-none ${priorityBadgeClass(
                          item.priority
                        )}`}
                      >
                        {PRIORITIES.map((pr) => (
                          <option key={pr} value={pr}>
                            {pr}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3.5 align-top whitespace-nowrap">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          onUpdateInitiative(item.id, {
                            status: e.target.value as InitiativeStatus,
                          })
                        }
                        aria-label={`Estado de ${item.code}`}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium focus:outline-none ${statusBadgeClass(
                          item.status
                        )}`}
                      >
                        {STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vista Matriz Heatmap: Factibilidad, Urgencia y Potencial */}
      {viewMode === 'heatmap' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70 lg:col-span-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Matriz Heatmap: Factibilidad vs. Urgencia e Impacto Potencial
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Eje vertical: Urgencia (1–5) · Eje horizontal: Factibilidad (1–5) · Haz clic en un código para ver detalle
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="min-w-[540px]">
                <div className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))] gap-2">
                  {[5, 4, 3, 2, 1].map((urgencyRow) => (
                    <div key={urgencyRow} className="contents">
                      <div className="flex items-center justify-end pr-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                        Urg {urgencyRow}
                      </div>
                      {[1, 2, 3, 4, 5].map((feasCol) => {
                        const cellItems = filtered.filter(
                          (item) =>
                            item.urgency === urgencyRow &&
                            item.feasibility === feasCol
                        );
                        return (
                          <div
                            key={`${urgencyRow}-${feasCol}`}
                            className={`min-h-[76px] rounded-lg border p-2 transition-colors ${getCellTone(
                              urgencyRow,
                              feasCol
                            )}`}
                          >
                            <div className="flex flex-wrap gap-1.5">
                              {cellItems.map((item) => {
                                const isSelected = activeSelected?.id === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setSelectedInitiative(item)}
                                    className={`rounded-md border px-2 py-1 font-mono text-xs font-semibold transition-all ${
                                      isSelected
                                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                                        : 'border-slate-300 bg-white text-slate-800 hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                                    }`}
                                    title={`${item.title} (Potencial ${item.potential}/5)`}
                                  >
                                    {item.code}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div />
                  {[1, 2, 3, 4, 5].map((feasCol) => (
                    <div
                      key={`col-${feasCol}`}
                      className="pt-1 text-center font-mono text-xs text-slate-500 dark:text-slate-400"
                    >
                      Fact {feasCol}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Panel lateral de detalle en Matriz */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70 lg:col-span-4">
            <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {activeSelected.code} · {activeSelected.owner_role}
            </span>
            <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-50">
              {activeSelected.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {activeSelected.related_objective}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-950/40">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Factibilidad
                </div>
                <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {activeSelected.feasibility}/5
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Urgencia
                </div>
                <div className="mt-0.5 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {activeSelected.urgency}/5
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Potencial
                </div>
                <div className="mt-0.5 font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {activeSelected.potential}/5
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 text-xs dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Costo estimado
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrencyUSD(activeSelected.estimated_cost_usd)} USD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Duración estimada
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {activeSelected.duration_months} meses
                </span>
              </div>
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Estado de ejecución
                </label>
                <select
                  value={activeSelected.status}
                  onChange={(e) =>
                    onUpdateInitiative(activeSelected.id, {
                      status: e.target.value as InitiativeStatus,
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
