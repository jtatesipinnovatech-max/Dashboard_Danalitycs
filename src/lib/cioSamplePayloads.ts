import type { CioPayloadType } from './cioIngestionModel';

export function getSampleCioPayload(tipo: CioPayloadType): Record<string, unknown> {
  switch (tipo) {
    case 'indicador':
      return {
        tipo: 'indicador',
        indicador: 'Autoevaluación EDM ISO 38500',
        valor: 61.29,
        fecha: '2026-11-18',
      };

    case 'madurez_ceipa':
      return {
        tipo: 'madurez_ceipa',
        resultados: [
          { dimension: 'Madurez global', nivel: 'Intermedio', fecha_evaluacion: '2026-10-08' },
          { dimension: 'Visión Estratégica', nivel: 'Intermedio', fecha_evaluacion: '2026-10-08' },
          { dimension: 'Capacidad Digital', nivel: 'Básico', fecha_evaluacion: '2026-10-08' },
          { dimension: 'Dirección y Evaluación Digital', nivel: 'Básico', fecha_evaluacion: '2026-10-08' },
          { dimension: 'Portafolio Digital', nivel: 'Intermedio', fecha_evaluacion: '2026-10-08' },
        ],
      };

    case 'estrategia_ti':
      return {
        tipo: 'estrategia_ti',
        objetivos: [
          {
            codigo: 'OE-01',
            nombre: 'Gobierno de Datos y Cumplimiento Ley 1581',
            fecha_objetivo: '2027-06-30',
          },
          {
            codigo: 'OE-02',
            nombre: 'Optimización FinOps y Arquitectura Cloud',
            fecha_objetivo: '2027-09-30',
          },
        ],
        iniciativas: [
          {
            codigo: 'B001',
            nombre: 'Programa integral de cumplimiento Ley 1581 y Habeas Data',
            objetivo_codigo: 'OE-01',
            trimestre: 1,
            anio: 2027,
          },
          {
            codigo: 'B002',
            nombre: 'Gobernanza FinOps y etiquetado automático Cloud',
            objetivo_codigo: 'OE-02',
            trimestre: 2,
            anio: 2027,
          },
        ],
      };

    case 'dofa':
      return {
        tipo: 'dofa',
        factores: [
          { codigo: 'F1', descripcion: 'Equipo técnico especializado en analítica avanzada e IA.' },
          { codigo: 'D1', descripcion: 'Brecha crítica (0/100) en cumplimiento formal de protección de datos Ley 1581.' },
          { codigo: 'D4', descripcion: 'Ausencia de registro formalizado de evaluación de proveedores TI.' },
          { codigo: 'D5', descripcion: 'Evaluación ISO 38500 actual basada en evidencia documental no auditada.' },
          { codigo: 'O1', descripcion: 'Demanda creciente de soluciones analíticas gobernadas en sector empresarial.' },
          { codigo: 'A1', descripcion: 'Sanciones regulatorias SIC por tratamiento no documentado de datos personales.' },
        ],
      };

    case 'bsc': {
      const dims = [
        'Enfoque estratégico',
        'Traslado hacia el BSC',
        'Sincronización y despliegue',
        'Cultura de ejecución',
      ];
      const preguntas = Array.from({ length: 40 }, (_, i) => {
        const num = i + 1;
        const dim = dims[Math.floor(i / 10)];
        return {
          codigo: `BSC-${String(num).padStart(2, '0')}`,
          dimension: dim,
          pregunta: `Reactivo de diagnóstico ${num} para la dimensión ${dim} en DAnalytics.`,
        };
      });
      return { tipo: 'bsc', preguntas };
    }

    case 'porter':
      return {
        tipo: 'porter',
        fuerzas: [
          { codigo: 'RIV', descripcion: 'Alta competencia de consultoras boutique en BI y analítica en Colombia.' },
          { codigo: 'ENT', descripcion: 'Barreras medias por especialización en ingeniería de datos y gobierno.' },
          { codigo: 'CLI', descripcion: 'Clientes B2B exigen cumplimiento Ley 1581 y acuerdos de nivel de servicio.' },
          { codigo: 'SUS', descripcion: 'Plataformas self-service y copilotos estándar como sustitutos parciales.' },
          { codigo: 'PRO', descripcion: 'Dependencia concentrada en proveedores hyperscaler Cloud (AWS/GCP/Azure).' },
        ],
      };

    case 'cadena_valor': {
      const schema: Array<[string, string, number, number]> = [
        ['Apoyo', 'Infraestructura empresarial', 1, 4],
        ['Apoyo', 'Gestión de recursos humanos', 2, 3],
        ['Apoyo', 'Desarrollo tecnológico', 3, 4],
        ['Apoyo', 'Gestión de compras', 4, 4],
        ['Principal', 'Logística de entrada', 1, 3],
        ['Principal', 'Producción y operación', 2, 3],
        ['Principal', 'Logística de salida', 3, 3],
        ['Principal', 'Marketing', 4, 3],
        ['Principal', 'Servicio postventa', 5, 3],
      ];
      let apCounter = 1;
      let prCounter = 1;
      const actividades: Array<Record<string, unknown>> = [];
      for (const [tipoAct, proceso, ordenProceso, count] of schema) {
        for (let ordenAct = 1; ordenAct <= count; ordenAct += 1) {
          const codigo =
            tipoAct === 'Apoyo'
              ? `AP-${String(apCounter++).padStart(2, '0')}`
              : `PR-${String(prCounter++).padStart(2, '0')}`;
          actividades.push({
            codigo,
            tipo: tipoAct,
            proceso,
            actividad: `Actividad ${ordenAct} de ${proceso} (DAnalytics)`,
            orden_proceso: ordenProceso,
            orden_actividad: ordenAct,
          });
        }
      }
      return { tipo: 'cadena_valor', actividades };
    }

    case 'mapa_estrategico': {
      const perspectivas = ['financiera', 'clientes', 'procesos', 'aprendizaje'];
      const objetivos = Array.from({ length: 16 }, (_, idx) => {
        const numero = idx + 1;
        const perspectiva = perspectivas[Math.floor(idx / 4)];
        return {
          numero,
          perspectiva,
          titulo: `Objetivo Estratégico ${numero} (${perspectiva})`,
          descripcion: `Meta estratégica #${numero} alineada al PETI DAnalytics en perspectiva ${perspectiva}.`,
        };
      });
      return { tipo: 'mapa_estrategico', objetivos };
    }

    case 'modelo_negocio': {
      const blocks: Array<[string, string, number]> = [
        ['socios_clave', 'SOC', 6],
        ['actividades_clave', 'ACT', 2],
        ['recursos_clave', 'REC', 3],
        ['propuesta_valor', 'VAL', 2],
        ['relaciones_clientes', 'REL', 3],
        ['canales', 'CAN', 3],
        ['segmentos_clientes', 'SEG', 2],
        ['estructura_costos', 'COS', 3],
        ['flujo_ingresos', 'ING', 3],
      ];
      const registros: Array<Record<string, unknown>> = [];
      for (const [bloque, prefijo, qty] of blocks) {
        for (let i = 1; i <= qty; i += 1) {
          registros.push({
            codigo: `${prefijo}-${String(i).padStart(2, '0')}`,
            bloque,
            descripcion: `Elemento ${i} del bloque ${bloque.replace('_', ' ')} DAnalytics.`,
            orden_elemento: i,
            fuente: 'Canvas Modelo de Negocio TI DAnalytics 2026',
          });
        }
      }
      return { tipo: 'modelo_negocio', registros };
    }

    case 'kpi':
      return {
        tipo: 'kpi',
        mediciones: [
          {
            kpi_codigo: 'KPI-01',
            periodo: '2026-11-01',
            numerador: 62,
            denominador: 100,
            fuente: 'Reporte Comité TI DAnalytics',
            evidencia: 'Acta Comité Noviembre 2026',
          },
          {
            kpi_codigo: 'KPI-07',
            periodo: '2026-11-01',
            numerador: 12,
            fuente: 'Backlog Portafolio B001–B012',
            evidencia: 'Tablero de iniciativas',
          },
        ],
      };

    case 'iso38500':
      return {
        tipo: 'iso38500',
        evaluaciones: [
          {
            principio_codigo: 'ISO-01',
            fecha_evaluacion: '2026-11-18',
            nivel: 3,
            evidencia: 'Matriz RACI TI aprobada por dirección técnica',
            fuente: 'Diagnóstico Documental ISO/IEC 38500:2024',
            evaluador: 'Oficina de Gobierno TI',
            observaciones: 'Estimación documental pendiente de auditoría externa.',
          },
          {
            principio_codigo: 'ISO-05',
            fecha_evaluacion: '2026-11-18',
            nivel: 2,
            evidencia: 'Brecha detectada en inventario de datos personales Ley 1581',
            fuente: 'Diagnóstico Documental ISO/IEC 38500:2024',
            evaluador: 'Oficina de Gobierno TI',
            observaciones: 'Prioridad crítica en iniciativa B001.',
          },
        ],
      };
  }
}
