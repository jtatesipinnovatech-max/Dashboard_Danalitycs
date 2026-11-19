import { useState } from 'react';
import { Check, Copy, Database, Download, X } from 'lucide-react';
import schemaSqlRaw from '../../supabase/schema.sql?raw';

interface SqlSchemaModalProps {
  open: boolean;
  onClose: () => void;
  syncSource: 'local' | 'supabase';
}

export function SqlSchemaModal({
  open,
  onClose,
  syncSource,
}: SqlSchemaModalProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(schemaSqlRaw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleDownload = () => {
    const blob = new Blob([schemaSqlRaw], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'danalytics_iso38500_supabase.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sql-modal-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-indigo-500" />
            <div>
              <h2
                id="sql-modal-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-50"
              >
                Esquema PostgreSQL / Supabase (DDL + Datos Semilla)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fuente activa:{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  {syncSource === 'supabase'
                    ? 'Conectado a Supabase'
                    : 'Persistencia local (configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para sincronizar)'}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <pre className="rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 overflow-x-auto dark:border-slate-800">
            <code>{schemaSqlRaw}</code>
          </pre>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Incluye RLS, tablas EDM, Principios ISO 38500, METI01–METI10 y Portafolio B001–B012
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar .sql</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>SQL copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar SQL</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
