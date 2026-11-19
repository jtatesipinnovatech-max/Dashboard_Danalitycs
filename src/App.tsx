import { useEffect, useState } from 'react';
import {
  Database,
  Download,
  Menu,
  Moon,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import { EdmPrinciplesView } from './components/EdmPrinciplesView';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { MetiIndicatorsView } from './components/MetiIndicatorsView';
import { PortfolioView } from './components/PortfolioView';
import { RisksComplianceView } from './components/RisksComplianceView';
import { SqlSchemaModal } from './components/SqlSchemaModal';
import { useGovernanceData } from './hooks/useGovernanceData';
import type { NavigationTab } from './types/governance';

const NAV_ITEMS: {
  id: NavigationTab;
  label: string;
}[] = [
  { id: 'executive', label: 'Dashboard' },
  { id: 'edm', label: 'Ciclo EDM' },
  { id: 'meti', label: 'Indicadores PETI' },
  { id: 'portfolio', label: 'Portafolio B001–B012' },
  { id: 'risks', label: 'Riesgos y Ley 1581' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('executive');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const {
    assessment,
    principles,
    indicators,
    initiatives,
    risks,
    syncSource,
    lastSavedMessage,
    updatePrinciple,
    updateMetiValue,
    updateInitiative,
    updateRiskStatus,
    resetToSeed,
  } = useGovernanceData();

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const handleSelectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleExportCsv = () => {
    const lines: string[] = [
      'Seccion,Codigo,Nombre,Valor_Actual,Meta_o_Nivel,Estado',
      ...principles.map(
        (p) =>
          `Principio ISO 38500,${p.code},"${p.name}",${p.estimated_score}/5,${p.target_score}/5,${
            p.is_audited ? 'Auditada' : 'Estimacion documental - no auditada'
          }`
      ),
      ...indicators.map(
        (m) =>
          `Indicador PETI,${m.code},"${m.name}",${
            m.current_value !== null
              ? `${m.current_value} ${m.unit}`
              : 'Sin dato / Pendiente'
          },${m.year_1_target} ${m.unit},${m.frequency}`
      ),
      ...initiatives.map(
        (i) =>
          `Portafolio,${i.code},"${i.title}",${i.estimated_cost_usd} USD,${i.duration_months} meses,${i.status}`
      ),
    ];

    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DAnalytics_GobiernoTI_ISO38500.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F5F7] text-slate-900 dark:bg-[#0F172A] dark:text-slate-100">
      {/* Top Horizontal Header matching Atlassian/Jira Custom Charts layout */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B1221]">
        <div className="mx-auto flex h-14 max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* Left: Brand Wordmark + Nav Tabs */}
          <div className="flex h-full items-center gap-6 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Abrir navegación"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('executive')}
              className="font-display text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
            >
              DAnalytics
            </button>

            <nav
              aria-label="Navegación principal"
              className="hidden h-full items-center gap-1 lg:flex"
            >
              {NAV_ITEMS.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`relative flex h-full items-center px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'text-[#0052CC] dark:text-sky-400'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {active && (
                      <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t bg-[#0052CC] dark:bg-sky-400" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Primary Action + Compact Utility Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded bg-[#0052CC] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0747A6] whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setSqlModalOpen(true)}
              title="Ver esquema PostgreSQL / Supabase"
              className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              <Database className="h-3.5 w-3.5 text-[#0052CC] dark:text-sky-400" />
              <span className="hidden sm:inline">SQL</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="rounded border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </button>

            <button
              type="button"
              onClick={resetToSeed}
              title="Restaurar línea base DAnalytics"
              aria-label="Restaurar línea base DAnalytics"
              className="rounded border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <nav
            aria-label="Navegación móvil"
            className="flex flex-col border-t border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-[#0B1221] lg:hidden"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`rounded-md px-3 py-2 text-left text-xs font-medium ${
                    active
                      ? 'bg-[#0052CC]/10 text-[#0052CC] dark:text-sky-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-5 sm:px-6">
        {activeTab === 'executive' && (
          <ExecutiveDashboard
            assessment={assessment}
            principles={principles}
            indicators={indicators}
            initiatives={initiatives}
            onNavigate={handleSelectTab}
          />
        )}

        {activeTab === 'edm' && (
          <EdmPrinciplesView
            principles={principles}
            onUpdatePrinciple={updatePrinciple}
          />
        )}

        {activeTab === 'meti' && (
          <MetiIndicatorsView
            indicators={indicators}
            onUpdateMetiValue={updateMetiValue}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView
            initiatives={initiatives}
            onUpdateInitiative={updateInitiative}
          />
        )}

        {activeTab === 'risks' && (
          <RisksComplianceView
            risks={risks}
            indicators={indicators}
            dataProtectionScore={assessment.data_protection_score}
            onUpdateRiskStatus={updateRiskStatus}
            onNavigate={handleSelectTab}
          />
        )}
      </main>

      {/* Toast Notification */}
      {lastSavedMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 rounded-md border border-emerald-500/35 bg-slate-900 px-4 py-2.5 text-xs font-medium text-emerald-300 shadow-lg"
        >
          {lastSavedMessage}
        </div>
      )}

      {/* SQL Schema Modal */}
      <SqlSchemaModal
        open={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        syncSource={syncSource}
      />
    </div>
  );
}
