import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  GitBranch,
  Pause,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Upload,
  Webhook,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CIO_MODEL_CATALOG,
  type CioIngestionResult,
  type CioIngestionSuccess,
  type CioPayloadType,
} from '../lib/cioIngestionModel';
import { getSampleCioPayload } from '../lib/cioSamplePayloads';

interface WorkflowSimulatorViewProps {
  onApplyToDashboard?: (result: CioIngestionSuccess) => void;
}

type NodeStatus = 'idle' | 'active' | 'success' | 'error';

interface FlowStageState {
  activeBranch: CioPayloadType | null;
  webhookStatus: NodeStatus;
  switchStatus: NodeStatus;
  validatorStatus: Record<CioPayloadType, NodeStatus>;
  storageStatus: Record<CioPayloadType, NodeStatus>;
  prepStatus: NodeStatus;
  initiativesStorageStatus: NodeStatus;
}

interface TelemetryEvent {
  id: string;
  timestamp: string;
  tipo: CioPayloadType;
  label: string;
  table: string;
  ok: boolean;
  recordCount: number;
  latencyMs: number;
  message: string;
  inputPayload: Record<string, unknown>;
  outputRecords: Array<Record<string, unknown>>;
}

interface SelectedNodeInfo {
  kind: 'webhook' | 'switch' | 'validator' | 'storage' | 'prep' | 'initiatives_storage';
  tipo?: CioPayloadType;
  title: string;
  subtitle: string;
}

interface Point {
  x: number;
  y: number;
}

const ROW_START_Y = 38;
const ROW_STEP_Y = 58;
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = ROW_START_Y + CIO_MODEL_CATALOG.length * ROW_STEP_Y + 18;
const CENTER_Y = CANVAS_HEIGHT / 2;

const COL = {
  webhook: { x: 20, w: 150, h: 74 },
  switch: { x: 215, w: 160, h: 86 },
  validator: { x: 430, w: 205, h: 44 },
  storage: { x: 690, w: 200, h: 44 },
  prep: { x: 940, w: 155, h: 44 },
  initiativesStorage: { x: 1135, w: 130, h: 44 },
};

const VALIDATOR_NODE_TITLES: Record<CioPayloadType, string> = {
  indicador: 'Validar Indicadores',
  madurez_ceipa: 'Validar CEIPA',
  estrategia_ti: 'Validar Estrategia TI',
  dofa: 'Validar DOFA',
  bsc: 'Validar BSC',
  porter: 'Validar Porter',
  cadena_valor: 'Validar Cadena Valor',
  mapa_estrategico: 'Validar Mapa Estrat.',
  modelo_negocio: 'Validar Modelo Neg.',
  kpi: 'Validar KPI',
  iso38500: 'Validar ISO 38500',
};

const STORAGE_NODE_TITLES: Record<CioPayloadType, string> = {
  indicador: 'indicadores_cio',
  madurez_ceipa: 'madurez_ceipa',
  estrategia_ti: 'objetivos_estrategicos',
  dofa: 'factores_dofa',
  bsc: 'bsc_diagnostico',
  porter: 'fuerzas_porter',
  cadena_valor: 'actividades_cadena_valor',
  mapa_estrategico: 'mapa_estrategico',
  modelo_negocio: 'modelo_negocio_ti',
  kpi: 'kpi_mediciones',
  iso38500: 'iso38500_evaluaciones',
};

const STREAM_SEQUENCE: CioPayloadType[] = [
  'indicador',
  'iso38500',
  'kpi',
  'dofa',
  'estrategia_ti',
  'madurez_ceipa',
  'porter',
  'bsc',
  'cadena_valor',
  'mapa_estrategico',
  'modelo_negocio',
];

function createEmptyRecordStatus(): Record<CioPayloadType, NodeStatus> {
  return {
    indicador: 'idle',
    madurez_ceipa: 'idle',
    estrategia_ti: 'idle',
    dofa: 'idle',
    bsc: 'idle',
    porter: 'idle',
    cadena_valor: 'idle',
    mapa_estrategico: 'idle',
    modelo_negocio: 'idle',
    kpi: 'idle',
    iso38500: 'idle',
  };
}

function createEmptyCounts(): Record<CioPayloadType, number> {
  return {
    indicador: 0,
    madurez_ceipa: 0,
    estrategia_ti: 0,
    dofa: 0,
    bsc: 0,
    porter: 0,
    cadena_valor: 0,
    mapa_estrategico: 0,
    modelo_negocio: 0,
    kpi: 0,
    iso38500: 0,
  };
}

function buildDynamicPayload(tipo: CioPayloadType, tick: number): Record<string, unknown> {
  const base = getSampleCioPayload(tipo);
  if (tipo === 'indicador') {
    const valores = [61.29, 62.4, 63.15, 64.8, 65.1];
    return {
      ...base,
      valor: valores[tick % valores.length],
      fecha: '2026-11-18',
    };
  }
  if (tipo === 'kpi') {
    const num = 60 + ((tick * 3) % 18);
    return {
      tipo: 'kpi',
      mediciones: [
        {
          kpi_codigo: 'KPI-01',
          periodo: '2026-11-01',
          numerador: num,
          denominador: 100,
          fuente: 'Telemetría Comité TI DAnalytics',
          evidencia: `Corte automático #${tick + 1}`,
        },
        {
          kpi_codigo: 'KPI-07',
          periodo: '2026-11-01',
          numerador: 12,
          fuente: 'Portafolio B001–B012',
          evidencia: 'Tablero de iniciativas',
        },
      ],
    };
  }
  if (tipo === 'iso38500') {
    const nivel = 2 + (tick % 2);
    return {
      tipo: 'iso38500',
      evaluaciones: [
        {
          principio_codigo: 'ISO-01',
          fecha_evaluacion: '2026-11-18',
          nivel,
          evidencia: `Revisión ciclo EDM #${tick + 1} con matriz RACI`,
          fuente: 'Diagnóstico ISO/IEC 38500:2024',
          evaluador: 'Oficina de Gobierno TI',
        },
        {
          principio_codigo: 'ISO-05',
          fecha_evaluacion: '2026-11-18',
          nivel: 2,
          evidencia: 'Monitoreo Ley 1581 en progreso (iniciativa B001)',
          fuente: 'Diagnóstico ISO/IEC 38500:2024',
          evaluador: 'Oficina de Gobierno TI',
        },
      ],
    };
  }
  return base;
}

function buildInvalidPayload(tipo: CioPayloadType): Record<string, unknown> {
  switch (tipo) {
    case 'indicador':
      return { tipo: 'indicador', indicador: 'Autoevaluación EDM', valor: 'no-numerico', fecha: '2026-11-18' };
    case 'madurez_ceipa':
      return { tipo: 'madurez_ceipa', resultados: [{ dimension: 'Inexistente', nivel: 'Alto', fecha_evaluacion: '2026-11-18' }] };
    case 'estrategia_ti':
      return {
        tipo: 'estrategia_ti',
        objetivos: [{ codigo: 'OE-01', nombre: 'Gobierno de Datos' }],
        iniciativas: [{ codigo: 'B001', nombre: 'Ley 1581', objetivo_codigo: 'OE-99', trimestre: 1, anio: 2027 }],
      };
    case 'dofa':
      return { tipo: 'dofa', factores: [{ codigo: 'X9', descripcion: 'Código fuera de catálogo F/D/O/A' }] };
    case 'bsc':
      return { tipo: 'bsc', preguntas: [{ codigo: 'BSC-01', dimension: 'Enfoque estratégico', pregunta: 'Incompleto (1 de 40)' }] };
    case 'porter':
      return { tipo: 'porter', fuerzas: [{ codigo: 'RIV', descripcion: 'Solo 1 de 5 fuerzas enviadas' }] };
    case 'cadena_valor':
      return { tipo: 'cadena_valor', actividades: [] };
    case 'mapa_estrategico':
      return { tipo: 'mapa_estrategico', objetivos: [{ numero: 1, perspectiva: 'financiera', titulo: 'Solo 1 de 16', descripcion: 'Incompleto' }] };
    case 'modelo_negocio':
      return { tipo: 'modelo_negocio', registros: [] };
    case 'kpi':
      return {
        tipo: 'kpi',
        mediciones: [{ kpi_codigo: 'KPI-01', periodo: '2026-11-01', numerador: 120, denominador: 100, fuente: 'Test' }],
      };
    case 'iso38500':
      return {
        tipo: 'iso38500',
        evaluaciones: [{ principio_codigo: 'ISO-99', fecha_evaluacion: '2026-11-18', nivel: 3, evidencia: 'x', fuente: 'x', evaluador: 'x' }],
      };
  }
}

function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

function bezierPath(a: Point, b: Point): string {
  const cx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${cx} ${a.y}, ${cx} ${b.y}, ${b.x} ${b.y}`;
}

export function WorkflowSimulatorView({ onApplyToDashboard }: WorkflowSimulatorViewProps) {
  const [isStreaming, setIsStreaming] = useState(true);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [autoSyncDashboard, setAutoSyncDashboard] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<CioPayloadType>('estrategia_ti');
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo>({
    kind: 'switch',
    title: 'Clasificar Datos (Switch)',
    subtitle: 'Enrutador de 11 ramas según campo tipo',
  });

  const [flowState, setFlowState] = useState<FlowStageState>({
    activeBranch: null,
    webhookStatus: 'idle',
    switchStatus: 'idle',
    validatorStatus: createEmptyRecordStatus(),
    storageStatus: createEmptyRecordStatus(),
    prepStatus: 'idle',
    initiativesStorageStatus: 'idle',
  });

  const [branchCounts, setBranchCounts] = useState<Record<CioPayloadType, number>>(
    () => createEmptyCounts()
  );
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [throughputSeries, setThroughputSeries] = useState<
    Array<{ tick: string; registros: number; latenciaMs: number; estado: number }>
  >([]);

  // Quick interactive test values for live custom execution
  const [customIndicatorValue, setCustomIndicatorValue] = useState('63.45');
  const [customJsonError, setCustomJsonError] = useState<string | null>(null);

  const packetGroupRef = useRef<SVGGElement | null>(null);
  const packetHaloRef = useRef<SVGCircleElement | null>(null);
  const packetCoreRef = useRef<SVGCircleElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const isExecutingRef = useRef(false);
  const tickCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const clearAnimationTimers = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearAnimationTimers();
  }, [clearAnimationTimers]);

  const animatePacketSegment = useCallback(
    (from: Point, to: Point, durationMs: number, color: string) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      const group = packetGroupRef.current;
      const halo = packetHaloRef.current;
      const core = packetCoreRef.current;
      if (!group || !halo || !core) return;

      halo.setAttribute('fill', color);
      core.setAttribute('fill', color);
      group.setAttribute('opacity', '1');

      const cx = (from.x + to.x) / 2;
      const p1 = { x: cx, y: from.y };
      const p2 = { x: cx, y: to.y };
      const start = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / durationMs);
        const eased =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const pt = cubicBezierPoint(from, p1, p2, to, eased);
        group.setAttribute('transform', `translate(${pt.x.toFixed(1)}, ${pt.y.toFixed(1)})`);
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else if (progress >= 1) {
          rafRef.current = null;
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    []
  );

  const hidePacket = useCallback(() => {
    if (packetGroupRef.current) {
      packetGroupRef.current.setAttribute('opacity', '0');
    }
  }, []);

  const rowCenterY = useCallback((tipo: CioPayloadType) => {
    const idx = CIO_MODEL_CATALOG.findIndex((m) => m.tipo === tipo);
    return ROW_START_Y + idx * ROW_STEP_Y + COL.validator.h / 2;
  }, []);

  const executeFlowSimulation = useCallback(
    async (tipo: CioPayloadType, customPayload?: Record<string, unknown>) => {
      if (isExecutingRef.current) return;
      isExecutingRef.current = true;
      clearAnimationTimers();

      const tick = tickCounterRef.current++;
      const payload = customPayload ?? buildDynamicPayload(tipo, tick);
      const factor = speed === 2 ? 0.55 : 1;
      const t1 = Math.round(320 * factor);
      const t2 = Math.round(360 * factor);
      const t3 = Math.round(340 * factor);
      const t4 = Math.round(300 * factor);

      const yBranch = rowCenterY(tipo);
      const pWebhookOut: Point = { x: COL.webhook.x + COL.webhook.w, y: CENTER_Y };
      const pSwitchIn: Point = { x: COL.switch.x, y: CENTER_Y };
      const pSwitchOut: Point = { x: COL.switch.x + COL.switch.w, y: CENTER_Y };
      const pValIn: Point = { x: COL.validator.x, y: yBranch };
      const pValOut: Point = { x: COL.validator.x + COL.validator.w, y: yBranch };
      const pStoreIn: Point = { x: COL.storage.x, y: yBranch };
      const pStoreOut: Point = { x: COL.storage.x + COL.storage.w, y: yBranch };
      const pPrepIn: Point = { x: COL.prep.x, y: yBranch };
      const pPrepOut: Point = { x: COL.prep.x + COL.prep.w, y: yBranch };
      const pIniStoreIn: Point = { x: COL.initiativesStorage.x, y: yBranch };

      // Phase 1: Webhook receives POST
      setFlowState({
        activeBranch: tipo,
        webhookStatus: 'active',
        switchStatus: 'idle',
        validatorStatus: createEmptyRecordStatus(),
        storageStatus: createEmptyRecordStatus(),
        prepStatus: 'idle',
        initiativesStorageStatus: 'idle',
      });
      animatePacketSegment(pWebhookOut, pSwitchIn, t1, '#2E93FA');

      // Execute real POST /api/indicadores-cio in parallel with Phase 1-2
      const startedAt = performance.now();
      let apiResult: CioIngestionResult & { persistenceWarning?: string };
      try {
        const res = await fetch('/api/indicadores-cio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        apiResult = (await res.json()) as CioIngestionResult;
      } catch {
        apiResult = {
          ok: false,
          tipo,
          error: 'Error de red llamando a /api/indicadores-cio',
        };
      }
      const latencyMs = Math.max(4, Math.round(performance.now() - startedAt));

      const schedule = (fn: () => void, delay: number) => {
        const id = window.setTimeout(fn, delay);
        timersRef.current.push(id);
      };

      // Phase 2: Switch routes to matched branch
      schedule(() => {
        setFlowState((prev) => ({
          ...prev,
          webhookStatus: 'success',
          switchStatus: 'active',
        }));
        animatePacketSegment(pSwitchOut, pValIn, t2, '#5F3DF5');
      }, t1);

      // Phase 3: Validator runs
      schedule(() => {
        setFlowState((prev) => ({
          ...prev,
          switchStatus: 'success',
          validatorStatus: {
            ...createEmptyRecordStatus(),
            [tipo]: apiResult.ok ? 'active' : 'error',
          },
        }));

        if (apiResult.ok) {
          animatePacketSegment(pValOut, pStoreIn, t3, '#10B981');
        } else {
          hidePacket();
        }
      }, t1 + t2);

      // Phase 4: Storage persists (or terminates on error)
      schedule(() => {
        if (!apiResult.ok) {
          const meta = CIO_MODEL_CATALOG.find((m) => m.tipo === tipo);
          const errEvent: TelemetryEvent = {
            id: `${tipo}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('es-CO'),
            tipo,
            label: meta?.label ?? tipo,
            table: meta?.tables.join(', ') ?? '-',
            ok: false,
            recordCount: 0,
            latencyMs,
            message: apiResult.error,
            inputPayload: payload,
            outputRecords: [],
          };
          setEvents((prev) => [errEvent, ...prev].slice(0, 18));
          setThroughputSeries((prev) => [
            ...prev.slice(-13),
            {
              tick: new Date().toLocaleTimeString('es-CO', {
                minute: '2-digit',
                second: '2-digit',
              }),
              registros: 0,
              latenciaMs: latencyMs,
              estado: 0,
            },
          ]);
          isExecutingRef.current = false;
          return;
        }

        setFlowState((prev) => ({
          ...prev,
          validatorStatus: { ...createEmptyRecordStatus(), [tipo]: 'success' },
          storageStatus: { ...createEmptyRecordStatus(), [tipo]: 'active' },
        }));

        if (tipo === 'estrategia_ti') {
          animatePacketSegment(pStoreOut, pPrepIn, t4, '#10B981');
        } else {
          hidePacket();
        }
      }, t1 + t2 + t3);

      const finishSuccess = () => {
        if (!apiResult.ok) return;
        const meta = CIO_MODEL_CATALOG.find((m) => m.tipo === tipo);

        setFlowState((prev) => ({
          ...prev,
          storageStatus: { ...createEmptyRecordStatus(), [tipo]: 'success' },
          prepStatus: tipo === 'estrategia_ti' ? 'success' : 'idle',
          initiativesStorageStatus: tipo === 'estrategia_ti' ? 'success' : 'idle',
        }));
        hidePacket();

        setBranchCounts((prev) => ({
          ...prev,
          [tipo]: prev[tipo] + apiResult.recordCount,
        }));

        const okEvent: TelemetryEvent = {
          id: `${tipo}-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('es-CO'),
          tipo,
          label: meta?.label ?? tipo,
          table: apiResult.tables.join(' → '),
          ok: true,
          recordCount: apiResult.recordCount,
          latencyMs,
          message: `OK (${apiResult.recordCount} reg. validados)`,
          inputPayload: payload,
          outputRecords: apiResult.records,
        };

        setEvents((prev) => [okEvent, ...prev].slice(0, 18));
        setThroughputSeries((prev) => [
          ...prev.slice(-13),
          {
            tick: new Date().toLocaleTimeString('es-CO', {
              minute: '2-digit',
              second: '2-digit',
            }),
            registros: apiResult.recordCount,
            latenciaMs: latencyMs,
            estado: 1,
          },
        ]);

        if (autoSyncDashboard && onApplyToDashboard) {
          onApplyToDashboard(apiResult);
        }

        isExecutingRef.current = false;
      };

      if (tipo === 'estrategia_ti') {
        schedule(() => {
          if (!apiResult.ok) return;
          setFlowState((prev) => ({
            ...prev,
            storageStatus: { ...createEmptyRecordStatus(), [tipo]: 'success' },
            prepStatus: 'active',
          }));
          animatePacketSegment(pPrepOut, pIniStoreIn, t4, '#2E93FA');
        }, t1 + t2 + t3 + t4);

        schedule(() => {
          if (!apiResult.ok) return;
          setFlowState((prev) => ({
            ...prev,
            prepStatus: 'success',
            initiativesStorageStatus: 'active',
          }));
        }, t1 + t2 + t3 + t4 * 2);

        schedule(finishSuccess, t1 + t2 + t3 + t4 * 2 + 220);
      } else {
        schedule(finishSuccess, t1 + t2 + t3 + 220);
      }
    },
    [
      animatePacketSegment,
      autoSyncDashboard,
      clearAnimationTimers,
      hidePacket,
      onApplyToDashboard,
      rowCenterY,
      speed,
    ]
  );

  // Trigger initial live packet on mount so the user sees movement immediately
  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      void executeFlowSimulation('estrategia_ti');
    }, 350);
    return () => window.clearTimeout(initTimer);
  }, [executeFlowSimulation]);

  // Continuous real-time stream when isStreaming is true
  useEffect(() => {
    if (!isStreaming) return;
    const intervalMs = speed === 2 ? 1900 : 2900;
    const timer = window.setInterval(() => {
      if (isExecutingRef.current) return;
      const nextTipo = STREAM_SEQUENCE[tickCounterRef.current % STREAM_SEQUENCE.length];
      void executeFlowSimulation(nextTipo);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [executeFlowSimulation, isStreaming, speed]);

  const handleRunCustomBranch = () => {
    setIsStreaming(false);
    if (selectedBranch === 'indicador') {
      const numeric = Number(customIndicatorValue);
      void executeFlowSimulation('indicador', {
        tipo: 'indicador',
        indicador: 'Autoevaluación EDM ISO 38500',
        valor: Number.isFinite(numeric) ? numeric : Number.NaN,
        fecha: '2026-11-18',
      });
      return;
    }
    void executeFlowSimulation(selectedBranch);
  };

  const handleSimulateError = () => {
    setIsStreaming(false);
    void executeFlowSimulation(selectedBranch, buildInvalidPayload(selectedBranch));
  };

  const handleUploadJsonFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCustomJsonError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const rawTipo = typeof parsed.tipo === 'string' ? parsed.tipo : '';
      const validTipo = CIO_MODEL_CATALOG.some((m) => m.tipo === rawTipo)
        ? (rawTipo as CioPayloadType)
        : selectedBranch;
      setIsStreaming(false);
      setSelectedBranch(validTipo);
      void executeFlowSimulation(validTipo, parsed);
    } catch {
      setCustomJsonError('El archivo cargado no contiene un JSON válido.');
    } finally {
      event.target.value = '';
    }
  };

  const handleResetStats = () => {
    setBranchCounts(createEmptyCounts());
    setEvents([]);
    setThroughputSeries([]);
    setCustomJsonError(null);
  };

  const totalStats = useMemo(() => {
    const okCount = events.filter((e) => e.ok).length;
    const errCount = events.filter((e) => !e.ok).length;
    const totalReg = Object.values(branchCounts).reduce((a, b) => a + b, 0);
    const avgLatency =
      events.length > 0
        ? Math.round(events.reduce((s, e) => s + e.latencyMs, 0) / events.length)
        : 0;
    return { okCount, errCount, totalReg, avgLatency };
  }, [branchCounts, events]);

  const branchChartData = useMemo(
    () =>
      CIO_MODEL_CATALOG.map((m) => ({
        name: m.tipo === 'modelo_negocio' ? 'canvas' : m.tipo === 'mapa_estrategico' ? 'mapa' : m.tipo,
        registros: branchCounts[m.tipo],
        isActive: flowState.activeBranch === m.tipo,
      })),
    [branchCounts, flowState.activeBranch]
  );

  const inspectedEvent = useMemo(() => {
    if (selectedNode.tipo) {
      return events.find((e) => e.tipo === selectedNode.tipo) ?? events[0] ?? null;
    }
    return events[0] ?? null;
  }, [events, selectedNode.tipo]);

  const nodeStyle = (status: NodeStatus, selected = false) => {
    if (status === 'error') {
      return 'border-rose-500 bg-rose-50 text-rose-900 shadow-[0_0_0_3px_rgba(244,63,94,0.18)] dark:bg-rose-950/60 dark:text-rose-200';
    }
    if (status === 'active') {
      return 'border-[#2E93FA] bg-sky-50 text-slate-900 shadow-[0_0_0_3px_rgba(46,147,250,0.22)] dark:bg-sky-950/50 dark:text-white';
    }
    if (status === 'success') {
      return 'border-emerald-500 bg-emerald-50/70 text-slate-900 dark:bg-emerald-950/40 dark:text-emerald-100';
    }
    if (selected) {
      return 'border-[#5F3DF5] bg-white text-slate-900 ring-2 ring-[#5F3DF5]/15 dark:bg-slate-900 dark:text-white';
    }
    return 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
  };

  return (
    <div className="space-y-3.5">
      {/* Top Simulation Control & KPI Strip */}
      <div className="rounded-lg border border-slate-200/90 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStreaming((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-colors ${
                isStreaming
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#5F3DF5] hover:bg-[#4E2EE0]'
              }`}
            >
              {isStreaming ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pausar tiempo real</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  <span>Iniciar tiempo real</span>
                </>
              )}
            </button>

            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value as CioPayloadType)}
              aria-label="Seleccionar rama del modelo"
              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {CIO_MODEL_CATALOG.map((m) => (
                <option key={m.tipo} value={m.tipo}>
                  {m.label} ({m.tipo})
                </option>
              ))}
            </select>

            {selectedBranch === 'indicador' && (
              <input
                type="text"
                value={customIndicatorValue}
                onChange={(e) => setCustomIndicatorValue(e.target.value)}
                placeholder="Valor %"
                className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
            )}

            <button
              type="button"
              onClick={handleRunCustomBranch}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2E93FA]/40 bg-[#2E93FA]/10 px-2.5 py-1.5 text-xs font-medium text-[#0052CC] hover:bg-[#2E93FA]/20 dark:text-sky-300"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Disparar rama</span>
            </button>

            <button
              type="button"
              onClick={handleSimulateError}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Simular fallo</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleUploadJsonFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Enviar .json</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={autoSyncDashboard}
                onChange={(e) => setAutoSyncDashboard(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 accent-[#5F3DF5]"
              />
              <span>Reflejar en Dashboard principal</span>
            </label>

            <div className="inline-flex rounded-md border border-slate-200 p-0.5 text-[11px] dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSpeed(1)}
                className={`rounded px-2 py-0.5 font-medium ${
                  speed === 1
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                1x
              </button>
              <button
                type="button"
                onClick={() => setSpeed(2)}
                className={`rounded px-2 py-0.5 font-medium ${
                  speed === 2
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                2x
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetStats}
              title="Reiniciar contadores de simulación"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {customJsonError && (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{customJsonError}</p>
        )}

        {/* Live Telemetry Micro-Strip */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-4">
          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-950">
            <span className="text-[11px] text-slate-500">Estado flujo</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100">
              <span
                className={`h-2 w-2 rounded-full ${
                  isStreaming ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              {isStreaming ? 'En vivo' : 'Manual'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-950">
            <span className="text-[11px] text-slate-500">Rama activa</span>
            <span className="font-mono text-xs font-semibold text-[#0052CC] dark:text-sky-400">
              {flowState.activeBranch ?? 'En espera'}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-950">
            <span className="text-[11px] text-slate-500">Registros procesados</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              {totalStats.totalReg}{' '}
              <span className="font-normal text-emerald-600">({totalStats.okCount} OK)</span>
              {totalStats.errCount > 0 && (
                <span className="font-normal text-rose-600"> / {totalStats.errCount} err</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-950">
            <span className="text-[11px] text-slate-500">Latencia API</span>
            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
              {totalStats.avgLatency} ms
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Dynamic Node-Graph Canvas */}
      <section className="rounded-lg border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Grafo Interactivo del Modelo de Datos DAnalytics (11 Ramas)
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Haz clic en cualquier nodo de validación o tabla para inspeccionar su ejecución o disparar una actualización en vivo
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2E93FA]" /> Recibiendo
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#5F3DF5]" /> Enrutando
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Guardado OK
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Bloqueado por error
            </span>
          </div>
        </div>

        <div className="overflow-x-auto bg-[#F8FAFC] p-3 dark:bg-[#0B1221]">
          <div
            className="relative mx-auto rounded-md border border-slate-200/70 dark:border-slate-800"
            style={{
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
              backgroundImage:
                'radial-gradient(rgba(148,163,184,0.35) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          >
            {/* SVG Connections & Animated Packet */}
            <svg
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="pointer-events-none absolute inset-0"
            >
              {/* Webhook -> Switch */}
              <path
                d={bezierPath(
                  { x: COL.webhook.x + COL.webhook.w, y: CENTER_Y },
                  { x: COL.switch.x, y: CENTER_Y }
                )}
                fill="none"
                stroke={
                  flowState.webhookStatus === 'active' || flowState.switchStatus === 'active'
                    ? '#2E93FA'
                    : '#CBD5E1'
                }
                strokeWidth={
                  flowState.webhookStatus === 'active' || flowState.switchStatus === 'active'
                    ? 2.5
                    : 1.5
                }
              />

              {/* Switch -> 11 Validators -> 11 Storages (+ Estrategia TI extra chain) */}
              {CIO_MODEL_CATALOG.map((model) => {
                const y = rowCenterY(model.tipo);
                const isBranchActive = flowState.activeBranch === model.tipo;
                const valStatus = flowState.validatorStatus[model.tipo];
                const storeStatus = flowState.storageStatus[model.tipo];

                const wireSwitchToVal = isBranchActive
                  ? valStatus === 'error'
                    ? '#F43F5E'
                    : '#5F3DF5'
                  : '#CBD5E1';

                const wireValToStore =
                  valStatus === 'error'
                    ? '#FCA5A5'
                    : isBranchActive &&
                        (valStatus === 'success' ||
                          storeStatus === 'active' ||
                          storeStatus === 'success')
                      ? '#10B981'
                      : '#CBD5E1';

                return (
                  <g key={model.tipo}>
                    <path
                      d={bezierPath(
                        { x: COL.switch.x + COL.switch.w, y: CENTER_Y },
                        { x: COL.validator.x, y }
                      )}
                      fill="none"
                      stroke={wireSwitchToVal}
                      strokeWidth={isBranchActive ? 2.5 : 1.3}
                      strokeOpacity={isBranchActive ? 1 : 0.75}
                    />
                    <path
                      d={bezierPath(
                        { x: COL.validator.x + COL.validator.w, y },
                        { x: COL.storage.x, y }
                      )}
                      fill="none"
                      stroke={wireValToStore}
                      strokeWidth={isBranchActive && valStatus !== 'error' ? 2.5 : 1.3}
                      strokeDasharray={valStatus === 'error' ? '4 4' : undefined}
                    />

                    {model.tipo === 'estrategia_ti' && (
                      <>
                        <path
                          d={bezierPath(
                            { x: COL.storage.x + COL.storage.w, y },
                            { x: COL.prep.x, y }
                          )}
                          fill="none"
                          stroke={
                            flowState.prepStatus === 'active' ||
                            flowState.prepStatus === 'success'
                              ? '#10B981'
                              : '#CBD5E1'
                          }
                          strokeWidth={
                            flowState.prepStatus === 'active' ||
                            flowState.prepStatus === 'success'
                              ? 2.5
                              : 1.5
                          }
                        />
                        <path
                          d={bezierPath(
                            { x: COL.prep.x + COL.prep.w, y },
                            { x: COL.initiativesStorage.x, y }
                          )}
                          fill="none"
                          stroke={
                            flowState.initiativesStorageStatus === 'active' ||
                            flowState.initiativesStorageStatus === 'success'
                              ? '#2E93FA'
                              : '#CBD5E1'
                          }
                          strokeWidth={
                            flowState.initiativesStorageStatus === 'active' ||
                            flowState.initiativesStorageStatus === 'success'
                              ? 2.5
                              : 1.5
                          }
                        />
                      </>
                    )}
                  </g>
                );
              })}

              {/* Animated Traveling Data Packet */}
              <g ref={packetGroupRef} opacity={0}>
                <circle
                  ref={packetHaloRef}
                  r={10}
                  fill="#2E93FA"
                  fillOpacity={0.25}
                />
                <circle ref={packetCoreRef} r={5} fill="#2E93FA" />
              </g>
            </svg>

            {/* Node 1: Recibir Datos (Webhook) */}
            <button
              type="button"
              onClick={() =>
                setSelectedNode({
                  kind: 'webhook',
                  title: 'Recibir Datos (Webhook)',
                  subtitle: 'POST /api/indicadores-cio',
                })
              }
              style={{
                left: `${COL.webhook.x}px`,
                top: `${CENTER_Y - COL.webhook.h / 2}px`,
                width: `${COL.webhook.w}px`,
                height: `${COL.webhook.h}px`,
              }}
              className={`absolute flex flex-col justify-between rounded-lg border p-2.5 text-left transition-all ${nodeStyle(
                flowState.webhookStatus,
                selectedNode.kind === 'webhook'
              )}`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                  <Webhook className="h-3.5 w-3.5 text-[#2E93FA]" />
                  Recibir Datos
                </span>
                {flowState.webhookStatus === 'active' && (
                  <Zap className="h-3 w-3 animate-pulse text-[#2E93FA]" />
                )}
              </div>
              <span className="truncate font-mono text-[10px] text-slate-500 dark:text-slate-400">
                POST /indicadores-cio
              </span>
            </button>

            {/* Node 2: Clasificar Datos (Switch) */}
            <button
              type="button"
              onClick={() =>
                setSelectedNode({
                  kind: 'switch',
                  title: 'Clasificar Datos (Switch)',
                  subtitle: 'Enrutador de 11 ramas según campo tipo',
                })
              }
              style={{
                left: `${COL.switch.x}px`,
                top: `${CENTER_Y - COL.switch.h / 2}px`,
                width: `${COL.switch.w}px`,
                height: `${COL.switch.h}px`,
              }}
              className={`absolute flex flex-col justify-between rounded-lg border p-2.5 text-left transition-all ${nodeStyle(
                flowState.switchStatus,
                selectedNode.kind === 'switch'
              )}`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                  <GitBranch className="h-3.5 w-3.5 text-[#5F3DF5]" />
                  Clasificar Datos
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                11 reglas ·{' '}
                <span className="font-mono font-semibold text-[#5F3DF5] dark:text-violet-300">
                  {flowState.activeBranch ?? 'switch'}
                </span>
              </div>
            </button>

            {/* Nodes 3 & 4: 11 Validators + 11 Storage Tables */}
            {CIO_MODEL_CATALOG.map((model, idx) => {
              const top = ROW_START_Y + idx * ROW_STEP_Y;
              const valStatus = flowState.validatorStatus[model.tipo];
              const storeStatus = flowState.storageStatus[model.tipo];
              const count = branchCounts[model.tipo];

              return (
                <div key={model.tipo}>
                  {/* Validator Node */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranch(model.tipo);
                      setSelectedNode({
                        kind: 'validator',
                        tipo: model.tipo,
                        title: VALIDATOR_NODE_TITLES[model.tipo],
                        subtitle: model.ruleSummary,
                      });
                    }}
                    style={{
                      left: `${COL.validator.x}px`,
                      top: `${top}px`,
                      width: `${COL.validator.w}px`,
                      height: `${COL.validator.h}px`,
                    }}
                    className={`absolute flex items-center justify-between gap-2 rounded-md border px-2.5 text-left transition-all ${nodeStyle(
                      valStatus,
                      selectedNode.kind === 'validator' && selectedNode.tipo === model.tipo
                    )}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold">
                        {VALIDATOR_NODE_TITLES[model.tipo]}
                      </p>
                      <p className="truncate font-mono text-[9px] text-slate-400">
                        tipo: {model.tipo}
                      </p>
                    </div>
                    {valStatus === 'error' ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                    ) : valStatus === 'success' ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : valStatus === 'active' ? (
                      <Activity className="h-3.5 w-3.5 shrink-0 animate-pulse text-[#2E93FA]" />
                    ) : null}
                  </button>

                  {/* Storage Node */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranch(model.tipo);
                      setSelectedNode({
                        kind: 'storage',
                        tipo: model.tipo,
                        title: `Guardar (${STORAGE_NODE_TITLES[model.tipo]})`,
                        subtitle: `Tabla PostgreSQL: ${STORAGE_NODE_TITLES[model.tipo]}`,
                      });
                    }}
                    style={{
                      left: `${COL.storage.x}px`,
                      top: `${top}px`,
                      width: `${COL.storage.w}px`,
                      height: `${COL.storage.h}px`,
                    }}
                    className={`absolute flex items-center justify-between gap-2 rounded-md border px-2.5 text-left transition-all ${nodeStyle(
                      storeStatus,
                      selectedNode.kind === 'storage' && selectedNode.tipo === model.tipo
                    )}`}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate font-mono text-[10px] font-medium">
                        {STORAGE_NODE_TITLES[model.tipo]}
                      </span>
                    </div>
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {count}
                    </span>
                  </button>

                  {/* Extra Chain for Estrategia TI */}
                  {model.tipo === 'estrategia_ti' && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedNode({
                            kind: 'prep',
                            tipo: 'estrategia_ti',
                            title: 'Preparar Iniciativas TI',
                            subtitle: 'Transforma y valida códigos de iniciativas B001–B012',
                          })
                        }
                        style={{
                          left: `${COL.prep.x}px`,
                          top: `${top}px`,
                          width: `${COL.prep.w}px`,
                          height: `${COL.prep.h}px`,
                        }}
                        className={`absolute flex items-center justify-between rounded-md border px-2.5 text-left transition-all ${nodeStyle(
                          flowState.prepStatus,
                          selectedNode.kind === 'prep'
                        )}`}
                      >
                        <span className="truncate text-[10px] font-semibold">
                          Preparar Iniciativas
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedNode({
                            kind: 'initiatives_storage',
                            tipo: 'estrategia_ti',
                            title: 'Guardar Iniciativas',
                            subtitle: 'Tabla PostgreSQL: iniciativas_ti',
                          })
                        }
                        style={{
                          left: `${COL.initiativesStorage.x}px`,
                          top: `${top}px`,
                          width: `${COL.initiativesStorage.w}px`,
                          height: `${COL.initiativesStorage.h}px`,
                        }}
                        className={`absolute flex items-center gap-1.5 rounded-md border px-2 text-left transition-all ${nodeStyle(
                          flowState.initiativesStorageStatus,
                          selectedNode.kind === 'initiatives_storage'
                        )}`}
                      >
                        <Database className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate font-mono text-[10px] font-medium">
                          iniciativas_ti
                        </span>
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Dynamic Charts & Live Node Inspector */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Live Throughput & Latency Area Chart */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
            Pulso de Actualizaciones en Tiempo Real
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Registros validados por evento ejecutado
          </p>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughputSeries}>
                <defs>
                  <linearGradient id="liveFlowFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2E93FA" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#2E93FA" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="tick" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} width={28} />
                <Tooltip
                  contentStyle={{
                    fontSize: '11px',
                    borderRadius: '6px',
                    borderColor: '#E2E8F0',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="registros"
                  name="Registros"
                  stroke="#2E93FA"
                  strokeWidth={2}
                  fill="url(#liveFlowFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Live Records per Branch Bar Chart */}
        <section className="rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
            Volumen Acumulado por Rama del Flujo
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Actualización dinámica según pasan los eventos
          </p>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: '#64748B' }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={44}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} width={28} />
                <Tooltip
                  contentStyle={{
                    fontSize: '11px',
                    borderRadius: '6px',
                    borderColor: '#E2E8F0',
                  }}
                />
                <Bar dataKey="registros" name="Registros" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {branchChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.isActive ? '#5F3DF5' : '#2E93FA'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Interactive Node Inspector + Live Event Feed */}
        <section className="flex flex-col rounded-lg border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                {selectedNode.title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedNode.subtitle}
              </p>
            </div>
            {selectedNode.tipo && (
              <button
                type="button"
                onClick={() => {
                  setIsStreaming(false);
                  void executeFlowSimulation(selectedNode.tipo!);
                }}
                className="inline-flex items-center gap-1 rounded bg-[#5F3DF5] px-2 py-1 text-[10px] font-medium text-white hover:bg-[#4E2EE0]"
              >
                <Sparkles className="h-3 w-3" />
                <span>Probar nodo</span>
              </button>
            )}
          </div>

          {inspectedEvent && (
            <div className="mt-2.5 rounded-md border border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between text-[10px]">
                <span
                  className={`font-semibold ${
                    inspectedEvent.ok ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {inspectedEvent.ok ? 'Último paquete válido' : 'Último paquete rechazado'} ·{' '}
                  {inspectedEvent.tipo}
                </span>
                <span className="font-mono text-slate-400">{inspectedEvent.latencyMs} ms</span>
              </div>
              <pre className="mt-1.5 max-h-24 overflow-auto font-mono text-[10px] text-slate-700 dark:text-slate-300">
                {JSON.stringify(
                  inspectedEvent.ok
                    ? inspectedEvent.outputRecords.slice(0, 2)
                    : { error: inspectedEvent.message, input: inspectedEvent.inputPayload },
                  null,
                  2
                )}
              </pre>
            </div>
          )}

          {/* Recent Live Stream Log */}
          <div className="mt-2.5 flex-1 overflow-auto">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Bitácora de ejecución en vivo
            </p>
            <div className="max-h-28 space-y-1 overflow-y-auto">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => {
                    setSelectedBranch(ev.tipo);
                    setSelectedNode({
                      kind: 'validator',
                      tipo: ev.tipo,
                      title: VALIDATOR_NODE_TITLES[ev.tipo],
                      subtitle: `Tabla: ${ev.table}`,
                    });
                  }}
                  className="flex cursor-pointer items-center justify-between rounded border border-slate-100 px-2 py-1 text-[11px] hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        ev.ok ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {ev.label}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-slate-400">
                    {ev.ok ? `+${ev.recordCount}` : 'ERR'} · {ev.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
