import { useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  FileWarning,
  X,
} from 'lucide-react';
import { EDM_CYCLE_ACTIONS } from '../data/governanceSeed';
import type {
  ConfidenceLevel,
  EdmStage,
  IsoPrinciple,
} from '../types/governance';

interface EdmPrinciplesViewProps {
  principles: IsoPrinciple[];
  onUpdatePrinciple: (
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
  ) => void;
}

const EDM_STAGES: {
  stage: EdmStage;
  subtitle: string;
  description: string;
}[] = [
  {
    stage: 'Evaluar',
    subtitle: 'Diagnóstico y Opciones Estratégicas',
    description:
      'Examinar el uso actual y futuro de las TI en DAnalytics, considerando riesgos regulatorios (Ley 1581), oportunidades de IA y capacidad organizacional.',
  },
  {
    stage: 'Dirigir',
    subtitle: 'Políticas, Responsabilidades e Inversiones',
    description:
      'Asignar responsabilidades y establecer directrices ejecutivas para asegurar que la transición a Level 4 y el uso de nube/IA cumplan objetivos de negocio.',
  },
  {
    stage: 'Monitorear',
    subtitle: 'Desempeño, Conformidad y Auditoría',
    description:
      'Supervisar indicadores PETI (METI01–METI10), verificar el cierre de brechas de seguridad y transformar estimaciones documentales en evidencias auditadas.',
  },
];

export function EdmPrinciplesView({
  principles,
  onUpdatePrinciple,
}: EdmPrinciplesViewProps) {
  const [activeStage, setActiveStage] = useState<EdmStage>('Evaluar');
  const [editingPrinciple, setEditingPrinciple] = useState<IsoPrinciple | null>(
    null
  );

  // Modal form state
  const [score, setScore] = useState<number>(3);
  const [confidence, setConfidence] = useState<ConfidenceLevel>('Media');
  const [isAudited, setIsAudited] = useState<boolean>(false);
  const [evidence, setEvidence] = useState<string>('');
  const [gap, setGap] = useState<string>('');
  const [recommendation, setRecommendation] = useState<string>('');

  const openEditor = (p: IsoPrinciple) => {
    setEditingPrinciple(p);
    setScore(p.estimated_score);
    setConfidence(p.confidence_level);
    setIsAudited(p.is_audited);
    setEvidence(p.evidence);
    setGap(p.gap_description);
    setRecommendation(p.recommendation);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrinciple) return;
    onUpdatePrinciple(editingPrinciple.id, {
      estimated_score: score,
      confidence_level: confidence,
      is_audited: isAudited,
      evidence: evidence.trim(),
      gap_description: gap.trim(),
      recommendation: recommendation.trim(),
    });
    setEditingPrinciple(null);
  };

  const stageMeta = EDM_STAGES.find((s) => s.stage === activeStage)!;
  const stageActions = EDM_CYCLE_ACTIONS.filter(
    (item) => item.stage === activeStage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Modelo de Gobernanza ISO/IEC 38500:2024
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Ciclo EDM y Principios de Gobierno TI
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 self-start sm:self-auto">
          <FileWarning className="h-3.5 w-3.5 shrink-0" />
          <span>Estimación documental – no auditada</span>
        </span>
      </div>

      {/* Ciclo EDM: Pestañas Evaluar / Dirigir / Monitorear */}
      <div className="rounded-md border border-slate-200 border-t-[3px] border-t-[#0052CC] bg-white p-6 shadow-xs dark:border-slate-800 dark:border-t-[#0052CC] dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Ciclo de Gobierno EDM (Evaluar · Dirigir · Monitorear)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {stageMeta.subtitle} — {stageMeta.description}
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80 self-start shrink-0">
            {EDM_STAGES.map((item) => {
              const active = activeStage === item.stage;
              return (
                <button
                  key={item.stage}
                  type="button"
                  onClick={() => setActiveStage(item.stage)}
                  className={`rounded px-4 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#0052CC] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {item.stage}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {stageActions.map((action) => (
            <div
              key={action.id}
              className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                    {action.code}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {action.cadence}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {action.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {action.description}
                </p>
              </div>
              <div className="mt-4 space-y-1.5 border-t border-slate-200/80 pt-3 text-xs dark:border-slate-800">
                <p className="text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Criterio:
                  </span>{' '}
                  {action.decision_criteria}
                </p>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>Principios: {action.linked_principles.join(', ')}</span>
                  <span className="truncate max-w-[140px]" title={action.owner}>
                    {action.owner}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla Interactiva de los 6 Principios ISO 38500 */}
      <div className="rounded-md border border-slate-200 border-t-[3px] border-t-[#FFAB00] bg-white shadow-xs dark:border-slate-800 dark:border-t-[#FFAB00] dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
              Evaluación de los 6 Principios ISO/IEC 38500
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Haz clic en «Editar evaluación» para ajustar puntaje, evidencias, brechas y estado de auditoría
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            6 principios · Escala 1 a 5
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-6 py-3">Principio</th>
                <th className="px-4 py-3">Resultado ISO 37000</th>
                <th className="px-4 py-3 text-right">Puntaje</th>
                <th className="px-4 py-3">Confianza</th>
                <th className="px-4 py-3">Estado Documental</th>
                <th className="px-4 py-3">Evidencia y Brecha Principal</th>
                <th className="px-6 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {principles.map((p) => {
                const scoreColor =
                  p.estimated_score >= 4
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : p.estimated_score === 3
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-red-600 dark:text-red-400';

                return (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-6 py-4 align-top">
                      <div className="font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {p.code}
                      </div>
                      <div className="mt-0.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {p.name}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {p.iso37000_outcome}
                    </td>
                    <td className="px-4 py-4 align-top text-right">
                      <div className={`font-mono text-sm font-semibold tabular-nums ${scoreColor}`}>
                        {p.estimated_score} / 5
                      </div>
                      <div className="mt-1.5 ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            p.estimated_score >= 4
                              ? 'bg-emerald-500'
                              : p.estimated_score === 3
                              ? 'bg-sky-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${(p.estimated_score / 5) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-xs font-medium text-slate-700 dark:text-slate-300">
                      {p.confidence_level}
                    </td>
                    <td className="px-4 py-4 align-top">
                      {p.is_audited ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Auditada</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap">
                          <FileWarning className="h-3.5 w-3.5 shrink-0" />
                          <span>Estimación documental – no auditada</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top max-w-md">
                      <p className="text-xs text-slate-700 dark:text-slate-200">
                        <span className="font-medium">Evidencia:</span> {p.evidence}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Brecha:
                        </span>{' '}
                        {p.gap_description}
                      </p>
                      <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">
                        <span className="font-medium">Recomendación:</span>{' '}
                        {p.recommendation}
                      </p>
                    </td>
                    <td className="px-6 py-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => openEditor(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Editar evaluación</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edición de Principio */}
      {editingPrinciple && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-principle-title"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <span className="font-mono text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {editingPrinciple.code} · {editingPrinciple.iso37000_outcome}
                </span>
                <h3
                  id="edit-principle-title"
                  className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-50"
                >
                  Editar Principio: {editingPrinciple.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPrinciple(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Puntaje estimado (1 - 5)
                  </label>
                  <select
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {[1, 2, 3, 4, 5].map((val) => (
                      <option key={val} value={val}>
                        {val} / 5
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nivel de confianza
                  </label>
                  <select
                    value={confidence}
                    onChange={(e) =>
                      setConfidence(e.target.value as ConfidenceLevel)
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Verificación
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAudited((v) => !v)}
                    className={`mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      isAudited
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    <span>{isAudited ? 'Auditada' : 'No auditada'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Evidencia documental
                </label>
                <textarea
                  rows={2}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Descripción de la brecha
                </label>
                <textarea
                  rows={2}
                  value={gap}
                  onChange={(e) => setGap(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Recomendación estratégica
                </label>
                <textarea
                  rows={2}
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPrinciple(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                >
                  Guardar evaluación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
