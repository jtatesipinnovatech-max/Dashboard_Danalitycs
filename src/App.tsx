import { useEffect, useState } from 'react';
import {
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
import { WorkflowSimulatorView } from './components/WorkflowSimulatorView';
import { useGovernanceData } from './hooks/useGovernanceData';
import { exportGovernancePdfReport } from './lib/exportPdfReport';
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
  { id: 'ingestion', label: 'Flujo de Datos' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('executive');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const {
    assessment,
    principles,
    indicators,
    initiatives,
    risks,
    lastSavedMessage,
    updatePrinciple,
    updateMetiValue,
    updateInitiative,
    updateRiskStatus,
    applyCioIngestionToDashboard,
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

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      exportGovernancePdfReport({
        assessment,
        principles,
        indicators,
        initiatives,
        risks,
      });
    } finally {
      window.setTimeout(() => setIsExportingPdf(false), 350);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA] text-slate-900 dark:bg-[#0F172A] dark:text-slate-100">
      {/* Top Horizontal Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white dark:border-slate-800 dark:bg-[#0B1221]">
        <div className="mx-auto flex h-14 max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* Left: Brand + Horizontal Nav Tabs */}
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

          {/* Right: Exportar PDF + Compact Theme/Reset Utilities */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#5F3DF5] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#4E2EE0] disabled:opacity-70 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isExportingPdf ? 'Generando PDF...' : 'Exportar PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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
              className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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

      {/* Full-Width Content Viewport */}
      <main className="mx-auto w-full max-w-[1480px] flex-1 p-3 sm:p-4 lg:p-5">
        {activeTab === 'executive' && (
          <ExecutiveDashboard
            assessment={assessment}
            principles={principles}
            indicators={indicators}
            initiatives={initiatives}
            risks={risks}
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

        {activeTab === 'ingestion' && (
          <WorkflowSimulatorView
            onApplyToDashboard={applyCioIngestionToDashboard}
          />
        )}
      </main>

      {/* Save Toast */}
      {lastSavedMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 rounded-md border border-emerald-500/35 bg-slate-900 px-4 py-2.5 text-xs font-medium text-emerald-300 shadow-lg"
        >
          {lastSavedMessage}
        </div>
      )}
    </div>
  );
}
