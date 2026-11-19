export type CioPayloadType =
  | 'indicador'
  | 'madurez_ceipa'
  | 'estrategia_ti'
  | 'dofa'
  | 'bsc'
  | 'porter'
  | 'cadena_valor'
  | 'mapa_estrategico'
  | 'modelo_negocio'
  | 'kpi'
  | 'iso38500';

export interface CioModelMeta {
  tipo: CioPayloadType;
  label: string;
  tables: string[];
  description: string;
  ruleSummary: string;
}

export const CIO_MODEL_CATALOG: CioModelMeta[] = [
  {
    tipo: 'indicador',
    label: 'Indicador CIO',
    tables: ['indicadores_cio'],
    description: 'Registro puntual de métricas ejecutivas CIO con fecha ISO.',
    ruleSummary: 'indicador (texto), valor (numérico finito), fecha (YYYY-MM-DD).',
  },
  {
    tipo: 'madurez_ceipa',
    label: 'Madurez CEIPA',
    tables: ['madurez_ceipa'],
    description: 'Diagnóstico de madurez digital en 5 dimensiones CEIPA 2026.',
    ruleSummary: 'Dimensiones únicas válidas + niveles Inicial..Excelencia + fecha_evaluacion.',
  },
  {
    tipo: 'estrategia_ti',
    label: 'Estrategia TI',
    tables: ['objetivos_estrategicos', 'iniciativas_ti'],
    description: 'Carga conjunta de objetivos estratégicos e iniciativas TI por trimestre.',
    ruleSummary: 'objetivos[] únicos + iniciativas[] vinculadas (código <= 10, trimestre 1-4).',
  },
  {
    tipo: 'dofa',
    label: 'Matriz DOFA',
    tables: ['factores_dofa'],
    description: 'Factores F/D/O/A con marcación automática de validación para D1, D4 y D5.',
    ruleSummary: 'Códigos ^[FDOA][1-9][0-9]*$ únicos, descripción obligatoria.',
  },
  {
    tipo: 'bsc',
    label: 'Diagnóstico BSC',
    tables: ['bsc_diagnostico'],
    description: 'Cuestionario Balanced Scorecard GySTI de 40 ítems en 4 dimensiones.',
    ruleSummary: 'Exactamente 40 preguntas (BSC-01..BSC-40), 10 por cada dimensión en orden.',
  },
  {
    tipo: 'porter',
    label: '5 Fuerzas de Porter',
    tables: ['fuerzas_porter'],
    description: 'Análisis competitivo de DAnalytics sobre las 5 fuerzas estructurales.',
    ruleSummary: 'Exactamente 5 fuerzas únicas: RIV, ENT, CLI, SUS, PRO.',
  },
  {
    tipo: 'cadena_valor',
    label: 'Cadena de Valor',
    tables: ['actividades_cadena_valor'],
    description: 'Mapa de 30 actividades de Apoyo (AP-xx) y Principales (PR-xx).',
    ruleSummary: 'Exactamente 30 actividades distribuidas en 9 procesos con orden estricto.',
  },
  {
    tipo: 'mapa_estrategico',
    label: 'Mapa Estratégico',
    tables: ['mapa_estrategico'],
    description: '16 objetivos estratégicos en 4 perspectivas (Financiera a Aprendizaje).',
    ruleSummary: 'Exactamente 16 objetivos numerados 1..16 alineados a su perspectiva.',
  },
  {
    tipo: 'modelo_negocio',
    label: 'Modelo de Negocio TI',
    tables: ['modelo_negocio_ti'],
    description: 'Business Model Canvas TI de 27 elementos distribuidos en 9 bloques.',
    ruleSummary: 'Exactamente 27 registros con prefijos SOC, ACT, REC, VAL, REL, CAN, SEG, COS, ING.',
  },
  {
    tipo: 'kpi',
    label: 'Mediciones KPI',
    tables: ['kpi_mediciones'],
    description: 'Mediciones periódicas KPI-01 a KPI-07 con numerador, denominador y evidencia.',
    ruleSummary: 'KPI-01..06 porcentaje (num <= den > 0), KPI-07 cantidad, clave única código:periodo.',
  },
  {
    tipo: 'iso38500',
    label: 'Evaluación ISO 38500',
    tables: ['iso38500_evaluaciones'],
    description: 'Evaluaciones ISO-01 a ISO-11 (nivel 0–4) con evidencia, fuente y evaluador.',
    ruleSummary: 'Principios ISO-01..ISO-11, nivel entero 0..4, fecha válida, sin duplicados.',
  },
];

export type CioIngestionSuccess =
  | {
      ok: true;
      tipo: 'estrategia_ti';
      tables: ['objetivos_estrategicos', 'iniciativas_ti'];
      recordCount: number;
      objetivos: Array<{
        codigo: string;
        nombre: string;
        fecha_objetivo: string | null;
        estado: 'sin_evaluar';
        fuente: string;
      }>;
      iniciativas: Array<{
        codigo: string;
        nombre: string;
        objetivo_codigo: string;
        trimestre: number;
        anio: number;
        estado: 'sin_evaluar';
        fuente: string;
      }>;
      records: Array<Record<string, unknown>>;
    }
  | {
      ok: true;
      tipo: Exclude<CioPayloadType, 'estrategia_ti'>;
      tables: [string];
      recordCount: number;
      records: Array<Record<string, unknown>>;
    };

export interface CioIngestionError {
  ok: false;
  tipo?: string;
  error: string;
}

export type CioIngestionResult = CioIngestionSuccess | CioIngestionError;

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(timestamp)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function unwrapPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Se esperaba un objeto JSON válido');
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.body === 'string') {
    const parsed = JSON.parse(obj.body) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('El campo body debe contener un objeto JSON válido');
    }
    return parsed as Record<string, unknown>;
  }
  if (obj.body && typeof obj.body === 'object' && !Array.isArray(obj.body)) {
    return obj.body as Record<string, unknown>;
  }
  return obj;
}

function validateIndicador(datos: Record<string, unknown>): CioIngestionSuccess {
  if (typeof datos.indicador !== 'string' || datos.indicador.trim() === '') {
    throw new Error('El indicador es obligatorio');
  }
  if (typeof datos.valor !== 'number' || !Number.isFinite(datos.valor)) {
    throw new Error('El valor debe ser numérico');
  }
  if (!isValidIsoDate(datos.fecha)) {
    throw new Error('La fecha debe ser válida (YYYY-MM-DD)');
  }

  const record = {
    indicador: datos.indicador.trim(),
    valor: datos.valor,
    fecha: datos.fecha,
    validado: true,
  };

  return {
    ok: true,
    tipo: 'indicador',
    tables: ['indicadores_cio'],
    recordCount: 1,
    records: [record],
  };
}

function validateCeipa(datos: Record<string, unknown>): CioIngestionSuccess {
  const dimensiones = [
    'Madurez global',
    'Visión Estratégica',
    'Capacidad Digital',
    'Dirección y Evaluación Digital',
    'Portafolio Digital',
  ];
  const niveles = ['Inicial', 'Básico', 'Intermedio', 'Avanzado', 'Excelencia'];

  if (!Array.isArray(datos.resultados) || datos.resultados.length === 0) {
    throw new Error('Se esperaba una lista de resultados');
  }

  const vistos = new Set<string>();
  const records = datos.resultados.map((rawItem) => {
    const item = (rawItem ?? {}) as Record<string, unknown>;
    const dimension = String(item.dimension ?? '').trim();
    const nivel = String(item.nivel ?? '').trim();

    if (!dimensiones.includes(dimension)) {
      throw new Error(`Dimensión no válida: ${dimension}`);
    }
    if (vistos.has(dimension)) {
      throw new Error(`Dimensión duplicada: ${dimension}`);
    }
    vistos.add(dimension);

    if (!niveles.includes(nivel)) {
      throw new Error(`Nivel no válido: ${nivel}`);
    }
    if (!isValidIsoDate(item.fecha_evaluacion)) {
      throw new Error(`Fecha no válida para ${dimension}`);
    }

    return {
      dimension,
      nivel,
      fecha_evaluacion: item.fecha_evaluacion,
      fuente: 'Diagnóstico Madurez Digital CEIPA 2026',
    };
  });

  return {
    ok: true,
    tipo: 'madurez_ceipa',
    tables: ['madurez_ceipa'],
    recordCount: records.length,
    records,
  };
}

function validateEstrategiaTi(datos: Record<string, unknown>): CioIngestionSuccess {
  if (!Array.isArray(datos.objetivos) || datos.objetivos.length === 0) {
    throw new Error('No se recibieron objetivos estratégicos');
  }
  if (!Array.isArray(datos.iniciativas) || datos.iniciativas.length === 0) {
    throw new Error('No se recibieron iniciativas TI');
  }

  const codigosObjetivos = new Set<string>();
  const objetivos = datos.objetivos.map((rawObj) => {
    const obj = (rawObj ?? {}) as Record<string, unknown>;
    const codigo = typeof obj.codigo === 'string' ? obj.codigo.trim() : '';
    const nombre = typeof obj.nombre === 'string' ? obj.nombre.trim() : '';
    if (!codigo || !nombre) {
      throw new Error('Código o nombre de objetivo inválido');
    }
    if (codigosObjetivos.has(codigo)) {
      throw new Error(`Objetivo duplicado: ${codigo}`);
    }
    codigosObjetivos.add(codigo);

    return {
      codigo,
      nombre,
      fecha_objetivo:
        typeof obj.fecha_objetivo === 'string' && obj.fecha_objetivo.trim()
          ? obj.fecha_objetivo.trim()
          : null,
      estado: 'sin_evaluar' as const,
      fuente: 'Estrategia TI DAnalytics',
    };
  });

  const codigosIniciativas = new Set<string>();
  const iniciativas = datos.iniciativas.map((rawIni) => {
    const ini = (rawIni ?? {}) as Record<string, unknown>;
    const codigo = typeof ini.codigo === 'string' ? ini.codigo.trim() : '';
    const nombre = typeof ini.nombre === 'string' ? ini.nombre.trim() : '';
    const objetivo_codigo =
      typeof ini.objetivo_codigo === 'string' ? ini.objetivo_codigo.trim() : '';
    const trimestre = ini.trimestre;
    const anio = ini.anio;

    if (!codigo || codigo.length > 10 || !nombre) {
      throw new Error('Código o nombre de iniciativa inválido');
    }
    if (codigosIniciativas.has(codigo)) {
      throw new Error(`Iniciativa duplicada: ${codigo}`);
    }
    codigosIniciativas.add(codigo);

    if (!codigosObjetivos.has(objetivo_codigo)) {
      throw new Error(`Objetivo no válido: ${objetivo_codigo}`);
    }
    if (!Number.isInteger(trimestre) || (trimestre as number) < 1 || (trimestre as number) > 4) {
      throw new Error(`Trimestre inválido: ${codigo}`);
    }
    if (!Number.isInteger(anio)) {
      throw new Error(`Año inválido: ${codigo}`);
    }

    return {
      codigo,
      nombre,
      objetivo_codigo,
      trimestre: trimestre as number,
      anio: anio as number,
      estado: 'sin_evaluar' as const,
      fuente: 'Estrategia TI DAnalytics',
    };
  });

  return {
    ok: true,
    tipo: 'estrategia_ti',
    tables: ['objetivos_estrategicos', 'iniciativas_ti'],
    recordCount: objetivos.length + iniciativas.length,
    objetivos,
    iniciativas,
    records: [
      ...objetivos.map((o) => ({ tabla: 'objetivos_estrategicos', ...o })),
      ...iniciativas.map((i) => ({ tabla: 'iniciativas_ti', ...i })),
    ],
  };
}

function validateDofa(datos: Record<string, unknown>): CioIngestionSuccess {
  if (!Array.isArray(datos.factores) || datos.factores.length === 0) {
    throw new Error('No se recibieron factores DOFA');
  }

  const categorias: Record<string, string> = {
    F: 'Fortaleza',
    D: 'Debilidad',
    O: 'Oportunidad',
    A: 'Amenaza',
  };

  const codigos = new Set<string>();
  const records = datos.factores.map((rawFactor) => {
    const factor = (rawFactor ?? {}) as Record<string, unknown>;
    const codigo = String(factor.codigo ?? '').trim();
    const descripcion = String(factor.descripcion ?? '').trim();

    if (!/^[FDOA][1-9][0-9]*$/.test(codigo)) {
      throw new Error(`Código DOFA inválido: ${codigo}`);
    }
    if (!descripcion) {
      throw new Error(`Descripción vacía: ${codigo}`);
    }
    if (codigos.has(codigo)) {
      throw new Error(`Factor duplicado: ${codigo}`);
    }
    codigos.add(codigo);

    return {
      codigo,
      categoria: categorias[codigo[0]],
      descripcion,
      requiere_validacion: ['D1', 'D4', 'D5'].includes(codigo),
      fuente: 'Matriz DOFA DAnalytics - 2026-10-08',
    };
  });

  return {
    ok: true,
    tipo: 'dofa',
    tables: ['factores_dofa'],
    recordCount: records.length,
    records,
  };
}

function validateBsc(datos: Record<string, unknown>): CioIngestionSuccess {
  if (!Array.isArray(datos.preguntas) || datos.preguntas.length !== 40) {
    throw new Error('La carga inicial requiere exactamente 40 preguntas BSC');
  }

  const dimensiones = [
    'Enfoque estratégico',
    'Traslado hacia el BSC',
    'Sincronización y despliegue',
    'Cultura de ejecución',
  ];

  const vistos = new Set<string>();
  const conteos: Record<string, number> = Object.fromEntries(dimensiones.map((d) => [d, 0]));

  const records = datos.preguntas.map((rawItem) => {
    const item = (rawItem ?? {}) as Record<string, unknown>;
    const codigo = String(item.codigo ?? '').trim();
    const dimension = String(item.dimension ?? '').normalize('NFC').trim();
    const pregunta = String(item.pregunta ?? '').trim();
    const numero = Number(codigo.replace('BSC-', ''));

    if (!/^BSC-(0[1-9]|[1-3][0-9]|40)$/.test(codigo)) {
      throw new Error(`Código inválido: ${codigo}`);
    }
    if (vistos.has(codigo)) {
      throw new Error(`Código duplicado: ${codigo}`);
    }
    vistos.add(codigo);

    const dimensionEsperada = dimensiones[Math.floor((numero - 1) / 10)];
    if (dimension !== dimensionEsperada) {
      throw new Error(`Dimensión incorrecta para ${codigo}`);
    }
    if (!pregunta) {
      throw new Error(`Pregunta vacía: ${codigo}`);
    }
    conteos[dimension] += 1;

    return {
      codigo,
      dimension,
      pregunta,
      fuente: 'Diagnostico BSC Gobierno TI GySTI',
    };
  });

  if (Object.values(conteos).some((n) => n !== 10)) {
    throw new Error('Cada dimensión debe incluir 10 preguntas');
  }

  return {
    ok: true,
    tipo: 'bsc',
    tables: ['bsc_diagnostico'],
    recordCount: records.length,
    records,
  };
}

function validatePorter(datos: Record<string, unknown>): CioIngestionSuccess {
  const nombres: Record<string, string> = {
    RIV: 'Rivalidad entre competidores',
    ENT: 'Amenaza de nuevos competidores',
    CLI: 'Poder de negociación de los compradores',
    SUS: 'Amenaza de productos o servicios sustitutos',
    PRO: 'Poder de negociación de los proveedores',
  };

  if (!Array.isArray(datos.fuerzas) || datos.fuerzas.length !== 5) {
    throw new Error('Se esperaban exactamente 5 fuerzas de Porter');
  }

  const codigos = new Set<string>();
  const records = datos.fuerzas.map((rawFuerza) => {
    const fuerza = (rawFuerza ?? {}) as Record<string, unknown>;
    const codigo = String(fuerza.codigo ?? '').trim();
    const descripcion = String(fuerza.descripcion ?? '').trim();

    if (!nombres[codigo]) {
      throw new Error(`Código inválido: ${codigo}`);
    }
    if (!descripcion) {
      throw new Error(`Descripción vacía: ${codigo}`);
    }
    if (codigos.has(codigo)) {
      throw new Error(`Código duplicado: ${codigo}`);
    }
    codigos.add(codigo);

    return {
      codigo,
      nombre: nombres[codigo],
      descripcion,
      intensidad: null,
      fuente: 'Danalytics-porter.pdf',
    };
  });

  return {
    ok: true,
    tipo: 'porter',
    tables: ['fuerzas_porter'],
    recordCount: records.length,
    records,
  };
}

function validateCadenaValor(datos: Record<string, unknown>): CioIngestionSuccess {
  if (!Array.isArray(datos.actividades) || datos.actividades.length !== 30) {
    throw new Error('La carga inicial debe contener exactamente 30 actividades');
  }

  const procesos: Record<string, Record<string, number>> = {
    Apoyo: {
      'Infraestructura empresarial': 4,
      'Gestión de recursos humanos': 3,
      'Desarrollo tecnológico': 4,
      'Gestión de compras': 4,
    },
    Principal: {
      'Logística de entrada': 3,
      'Producción y operación': 3,
      'Logística de salida': 3,
      Marketing: 3,
      'Servicio postventa': 3,
    },
  };

  const codigos = new Set<string>();
  const posiciones = new Set<string>();
  const conteos = new Map<string, number>();

  const records = datos.actividades.map((rawItem) => {
    const item = (rawItem ?? {}) as Record<string, unknown>;
    const codigo = String(item.codigo ?? '').trim();
    const tipo = String(item.tipo ?? '').trim();
    const proceso = String(item.proceso ?? '').trim();
    const actividad = String(item.actividad ?? '').trim();
    const orden_proceso = Number(item.orden_proceso);
    const orden_actividad = Number(item.orden_actividad);

    if (!/^(AP|PR)-\d{2}$/.test(codigo)) {
      throw new Error(`Código inválido: ${codigo}`);
    }
    if (
      (tipo === 'Apoyo' && !codigo.startsWith('AP-')) ||
      (tipo === 'Principal' && !codigo.startsWith('PR-'))
    ) {
      throw new Error(`El código ${codigo} no corresponde al tipo ${tipo}`);
    }
    if (!procesos[tipo] || !Object.prototype.hasOwnProperty.call(procesos[tipo], proceso)) {
      throw new Error(`Tipo o proceso no válido: ${tipo} / ${proceso}`);
    }
    if (!actividad) {
      throw new Error(`Actividad vacía: ${codigo}`);
    }
    if (
      !Number.isInteger(orden_proceso) ||
      orden_proceso < 1 ||
      !Number.isInteger(orden_actividad) ||
      orden_actividad < 1 ||
      orden_actividad > procesos[tipo][proceso]
    ) {
      throw new Error(`Orden inválido para ${codigo}`);
    }

    const procesosOrdenados = Object.keys(procesos[tipo]);
    if (procesosOrdenados[orden_proceso - 1] !== proceso) {
      throw new Error(`Orden del proceso incorrecto para ${codigo}`);
    }

    const posicion = `${tipo}:${proceso}:${orden_actividad}`;
    if (codigos.has(codigo) || posiciones.has(posicion)) {
      throw new Error(`Código o posición duplicados: ${codigo}`);
    }

    codigos.add(codigo);
    posiciones.add(posicion);
    conteos.set(`${tipo}:${proceso}`, (conteos.get(`${tipo}:${proceso}`) ?? 0) + 1);

    return {
      codigo,
      tipo,
      proceso,
      actividad,
      orden_proceso,
      orden_actividad,
      fuente: 'Cadena de valor - DAnalytics',
    };
  });

  for (const [tipo, grupos] of Object.entries(procesos)) {
    for (const [proceso, total] of Object.entries(grupos)) {
      if ((conteos.get(`${tipo}:${proceso}`) ?? 0) !== total) {
        throw new Error(`Número de actividades incorrecto en ${proceso}`);
      }
    }
  }

  return {
    ok: true,
    tipo: 'cadena_valor',
    tables: ['actividades_cadena_valor'],
    recordCount: records.length,
    records,
  };
}

function validateMapaEstrategico(datos: Record<string, unknown>): CioIngestionSuccess {
  if (!Array.isArray(datos.objetivos) || datos.objetivos.length !== 16) {
    throw new Error('La carga inicial requiere exactamente 16 objetivos');
  }

  const perspectivaPorNumero = (numero: number): string => {
    if (numero <= 4) return 'financiera';
    if (numero <= 8) return 'clientes';
    if (numero <= 12) return 'procesos';
    return 'aprendizaje';
  };

  const vistos = new Set<number>();
  const records = datos.objetivos.map((rawObj) => {
    const obj = (rawObj ?? {}) as Record<string, unknown>;
    const numero = obj.numero as number;
    const perspectiva = String(obj.perspectiva ?? '').trim();
    const titulo = String(obj.titulo ?? '').trim();
    const descripcion = String(obj.descripcion ?? '').trim();

    if (!Number.isInteger(numero) || numero < 1 || numero > 16) {
      throw new Error(`Número inválido: ${String(numero)}`);
    }
    if (vistos.has(numero)) {
      throw new Error(`Objetivo duplicado: ${numero}`);
    }
    vistos.add(numero);

    if (perspectiva !== perspectivaPorNumero(numero)) {
      throw new Error(`Perspectiva no válida para objetivo ${numero}`);
    }
    if (!titulo || titulo.length > 200 || !descripcion) {
      throw new Error(`Título o descripción inválidos para objetivo ${numero}`);
    }

    return {
      numero,
      perspectiva,
      titulo,
      descripcion,
      estado: 'sin_evaluar',
      fuente: 'MapaEstrategico.jsx - propuesta del dashboard',
    };
  });

  records.sort((a, b) => a.numero - b.numero);

  return {
    ok: true,
    tipo: 'mapa_estrategico',
    tables: ['mapa_estrategico'],
    recordCount: records.length,
    records,
  };
}

function validateModeloNegocio(datos: Record<string, unknown>): CioIngestionSuccess {
  const esperados: Record<string, [string, number]> = {
    socios_clave: ['SOC', 6],
    actividades_clave: ['ACT', 2],
    recursos_clave: ['REC', 3],
    propuesta_valor: ['VAL', 2],
    relaciones_clientes: ['REL', 3],
    canales: ['CAN', 3],
    segmentos_clientes: ['SEG', 2],
    estructura_costos: ['COS', 3],
    flujo_ingresos: ['ING', 3],
  };

  const registros = datos.registros;
  if (!Array.isArray(registros) || registros.length !== 27) {
    throw new Error(
      `Se esperaban 27 registros, se recibieron ${Array.isArray(registros) ? registros.length : 0}.`
    );
  }

  const codigos = new Set<string>();
  const ordenes = new Set<string>();
  const conteos: Record<string, number> = Object.fromEntries(
    Object.keys(esperados).map((k) => [k, 0])
  );
  const records: Array<Record<string, unknown>> = [];

  for (const rawReg of registros) {
    const r = (rawReg ?? {}) as Record<string, unknown>;
    const codigo = typeof r.codigo === 'string' ? r.codigo.trim() : '';
    const bloque = typeof r.bloque === 'string' ? r.bloque.trim() : '';
    const descripcion = typeof r.descripcion === 'string' ? r.descripcion.trim() : '';
    const fuente = typeof r.fuente === 'string' ? r.fuente.trim() : '';
    const orden_elemento = Number(r.orden_elemento);

    if (!(bloque in esperados)) {
      throw new Error(`Bloque inválido: ${bloque}`);
    }
    const [prefijo, cantidad] = esperados[bloque];
    if (!Number.isInteger(orden_elemento) || orden_elemento < 1 || orden_elemento > cantidad) {
      throw new Error(`Orden inválido para ${bloque}: ${String(r.orden_elemento)}`);
    }
    if (codigo !== `${prefijo}-${String(orden_elemento).padStart(2, '0')}`) {
      throw new Error(
        `Código incorrecto para ${bloque}, elemento ${orden_elemento}: ${codigo}`
      );
    }
    if (!descripcion || !fuente) {
      throw new Error(`Descripción o fuente vacía: ${codigo}`);
    }
    if (codigo.length > 12 || fuente.length > 150) {
      throw new Error(`Longitud excedida: ${codigo}`);
    }
    const claveOrden = `${bloque}:${orden_elemento}`;
    if (codigos.has(codigo) || ordenes.has(claveOrden)) {
      throw new Error(`Elemento duplicado: ${codigo}`);
    }

    codigos.add(codigo);
    ordenes.add(claveOrden);
    conteos[bloque] += 1;
    records.push({ codigo, bloque, descripcion, orden_elemento, fuente });
  }

  for (const [bloque, [, cantidad]] of Object.entries(esperados)) {
    if (conteos[bloque] !== cantidad) {
      throw new Error(
        `Cantidad incorrecta en ${bloque}: ${conteos[bloque]} (esperados ${cantidad}).`
      );
    }
  }

  return {
    ok: true,
    tipo: 'modelo_negocio',
    tables: ['modelo_negocio_ti'],
    recordCount: records.length,
    records,
  };
}

function validateKpi(datos: Record<string, unknown>): CioIngestionSuccess {
  const tipos: Record<string, 'porcentaje' | 'cantidad'> = {
    'KPI-01': 'porcentaje',
    'KPI-02': 'porcentaje',
    'KPI-03': 'porcentaje',
    'KPI-04': 'porcentaje',
    'KPI-05': 'porcentaje',
    'KPI-06': 'porcentaje',
    'KPI-07': 'cantidad',
  };

  if (!Array.isArray(datos.mediciones) || datos.mediciones.length === 0) {
    throw new Error('No se recibieron mediciones');
  }

  const vistos = new Set<string>();
  const records = datos.mediciones.map((rawMed) => {
    const m = (rawMed ?? {}) as Record<string, unknown>;
    const codigo = String(m.kpi_codigo ?? '').trim().toUpperCase();
    const tipo = tipos[codigo];

    if (!tipo) {
      throw new Error(`KPI desconocido: ${codigo}`);
    }
    if (!isValidIsoDate(m.periodo)) {
      throw new Error(`Periodo inválido para ${codigo}`);
    }
    if (!Number.isInteger(m.numerador) || (m.numerador as number) < 0) {
      throw new Error(`Numerador inválido para ${codigo}`);
    }

    let denominador: number | null = null;
    if (tipo === 'porcentaje') {
      if (
        !Number.isInteger(m.denominador) ||
        (m.denominador as number) <= 0 ||
        (m.numerador as number) > (m.denominador as number)
      ) {
        throw new Error(`Denominador inválido para ${codigo}`);
      }
      denominador = m.denominador as number;
    }

    const fuente = String(m.fuente ?? '').trim();
    if (!fuente) {
      throw new Error(`Falta la fuente de ${codigo}`);
    }

    const clave = `${codigo}:${m.periodo}`;
    if (vistos.has(clave)) {
      throw new Error(`Medición duplicada: ${clave}`);
    }
    vistos.add(clave);

    return {
      kpi_codigo: codigo,
      periodo: m.periodo,
      numerador: m.numerador as number,
      denominador,
      fuente,
      evidencia: typeof m.evidencia === 'string' && m.evidencia.trim() ? m.evidencia.trim() : null,
    };
  });

  return {
    ok: true,
    tipo: 'kpi',
    tables: ['kpi_mediciones'],
    recordCount: records.length,
    records,
  };
}

function validateIso38500(datos: Record<string, unknown>): CioIngestionSuccess {
  if (!Array.isArray(datos.evaluaciones) || datos.evaluaciones.length === 0) {
    throw new Error('No se recibieron evaluaciones');
  }

  const vistos = new Set<string>();
  const records = datos.evaluaciones.map((rawEval) => {
    const e = (rawEval ?? {}) as Record<string, unknown>;
    const codigo = String(e.principio_codigo ?? '').trim().toUpperCase();
    const numero = Number(codigo.split('-')[1]);

    if (!/^ISO-\d{2}$/.test(codigo) || numero < 1 || numero > 11) {
      throw new Error(`Principio inválido: ${codigo}`);
    }
    if (!Number.isInteger(e.nivel) || (e.nivel as number) < 0 || (e.nivel as number) > 4) {
      throw new Error(`Nivel inválido: ${codigo}`);
    }
    if (!isValidIsoDate(e.fecha_evaluacion)) {
      throw new Error(`Fecha inválida: ${codigo}`);
    }

    const evidencia = String(e.evidencia ?? '').trim();
    const fuente = String(e.fuente ?? '').trim();
    const evaluador = String(e.evaluador ?? '').trim();

    if (!evidencia || !fuente || !evaluador) {
      throw new Error(`Faltan datos de evidencia: ${codigo}`);
    }

    const clave = `${codigo}:${e.fecha_evaluacion}`;
    if (vistos.has(clave)) {
      throw new Error(`Evaluación duplicada: ${clave}`);
    }
    vistos.add(clave);

    return {
      principio_codigo: codigo,
      fecha_evaluacion: e.fecha_evaluacion,
      nivel: e.nivel as number,
      evidencia,
      fuente,
      evaluador,
      observaciones:
        typeof e.observaciones === 'string' && e.observaciones.trim()
          ? e.observaciones.trim()
          : null,
    };
  });

  return {
    ok: true,
    tipo: 'iso38500',
    tables: ['iso38500_evaluaciones'],
    recordCount: records.length,
    records,
  };
}

export function processCioIngestionPayload(rawInput: unknown): CioIngestionResult {
  let tipoStr: string | undefined;
  try {
    const datos = unwrapPayload(rawInput);
    tipoStr = typeof datos.tipo === 'string' ? datos.tipo.trim() : undefined;

    switch (tipoStr) {
      case 'indicador':
        return validateIndicador(datos);
      case 'madurez_ceipa':
        return validateCeipa(datos);
      case 'estrategia_ti':
        return validateEstrategiaTi(datos);
      case 'dofa':
        return validateDofa(datos);
      case 'bsc':
        return validateBsc(datos);
      case 'porter':
        return validatePorter(datos);
      case 'cadena_valor':
        return validateCadenaValor(datos);
      case 'mapa_estrategico':
        return validateMapaEstrategico(datos);
      case 'modelo_negocio':
        return validateModeloNegocio(datos);
      case 'kpi':
        return validateKpi(datos);
      case 'iso38500':
        return validateIso38500(datos);
      default:
        return {
          ok: false,
          tipo: tipoStr,
          error: tipoStr
            ? `Tipo de carga no soportado: "${tipoStr}".`
            : 'El campo "tipo" es obligatorio en el payload JSON.',
        };
    }
  } catch (err) {
    return {
      ok: false,
      tipo: tipoStr,
      error: err instanceof Error ? err.message : 'Error inesperado al validar payload',
    };
  }
}
