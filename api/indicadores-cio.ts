import { createClient } from '@supabase/supabase-js';
import {
  CIO_MODEL_CATALOG,
  processCioIngestionPayload,
} from '../src/lib/cioIngestionModel.ts';

interface VercelLikeRequest {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

async function persistRecordsToSupabase(
  result: ReturnType<typeof processCioIngestionPayload>
): Promise<{ persisted: boolean; warning?: string }> {
  if (!result.ok) return { persisted: false };

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl.includes('your-project.supabase.co') ||
    supabaseKey.includes('your-anon-key')
  ) {
    return { persisted: false };
  }

  try {
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (result.tipo === 'estrategia_ti') {
      const objRes = await client
        .from('objetivos_estrategicos')
        .insert(result.objetivos);
      if (objRes.error) {
        return { persisted: false, warning: objRes.error.message };
      }
      const iniRes = await client
        .from('iniciativas_ti')
        .insert(result.iniciativas);
      if (iniRes.error) {
        return { persisted: false, warning: iniRes.error.message };
      }
      return { persisted: true };
    }

    const table = result.tables[0];
    const cleanRecords =
      result.tipo === 'indicador'
        ? result.records.map(({ validado: _v, ...rest }) => rest)
        : result.records;

    const { error } = await client.from(table).insert(cleanRecords);
    if (error) {
      return { persisted: false, warning: error.message };
    }
    return { persisted: true };
  } catch (err) {
    return {
      persisted: false,
      warning: err instanceof Error ? err.message : 'Error de conexión Supabase',
    };
  }
}

export default async function handler(
  req: VercelLikeRequest,
  res: VercelLikeResponse
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    res.status(200).json({
      ok: true,
      endpoint: '/api/indicadores-cio',
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'express-node',
      modelos: CIO_MODEL_CATALOG,
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      ok: false,
      error: `Método ${req.method ?? 'desconocido'} no permitido. Usa POST o GET.`,
    });
    return;
  }

  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody) as unknown;
    } catch {
      res.status(400).json({
        ok: false,
        error: 'El cuerpo de la petición no es un JSON válido.',
      });
      return;
    }
  }

  const result = processCioIngestionPayload(parsedBody);
  if (!result.ok) {
    res.status(400).json(result);
    return;
  }

  const dbStatus = await persistRecordsToSupabase(result);

  res.status(200).json({
    ...result,
    persistedToSupabase: dbStatus.persisted,
    ...(dbStatus.warning ? { persistenceWarning: dbStatus.warning } : {}),
    processedAt: new Date().toISOString(),
  });
}
