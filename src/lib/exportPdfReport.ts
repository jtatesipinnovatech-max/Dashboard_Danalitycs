import { jsPDF } from 'jspdf';
import { SEED_MONTHLY_TRENDS } from '../data/governanceSeed';
import type {
  GovernanceAssessment,
  Initiative,
  IsoPrinciple,
  MetiIndicator,
  RiskItem,
} from '../types/governance';
import {
  calculateIso37000Outcomes,
  calculatePetiSummary,
  convertUsdToCop,
  evaluateMetiIndicator,
  formatCurrencyCOP,
  formatCurrencyCOPCompact,
} from './governanceMetrics';

export interface PdfExportPayload {
  assessment: GovernanceAssessment;
  principles: IsoPrinciple[];
  indicators: MetiIndicator[];
  initiatives: Initiative[];
  risks: RiskItem[];
}

function createCanvas(width: number, height: number) {
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx, width, height };
}

function renderMetiBarChartImage(indicators: MetiIndicator[]): string {
  const { canvas, ctx, width, height } = createCanvas(520, 230);
  const items = indicators.filter((i) => i.unit === '%');

  const padL = 42;
  const padR = 16;
  const padT = 26;
  const padB = 34;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  // Grid lines
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'right';

  [0, 25, 50, 75, 100].forEach((val) => {
    const y = padT + chartH - (val / 100) * chartH;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(width - padR, y);
    ctx.stroke();
    ctx.fillText(`${val}%`, padL - 6, y + 3);
  });

  const step = chartW / items.length;
  const barW = Math.min(28, step * 0.56);

  items.forEach((ind, idx) => {
    const val = ind.current_value ?? ind.baseline_value;
    const isPending = ind.current_value === null;
    const barH = (Math.min(100, Math.max(0, val)) / 100) * chartH;
    const x = padL + idx * step + (step - barW) / 2;
    const y = padT + chartH - barH;

    ctx.fillStyle = isPending ? '#94A3B8' : '#2E93FA';
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Value label
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${val}%`, x + barW / 2, y - 5);

    // X label
    ctx.fillStyle = '#475569';
    ctx.font = '9.5px sans-serif';
    ctx.fillText(ind.code, x + barW / 2, padT + chartH + 15);
  });

  // Legend
  ctx.textAlign = 'left';
  ctx.fillStyle = '#2E93FA';
  ctx.fillRect(padL, 6, 10, 10);
  ctx.fillStyle = '#334155';
  ctx.font = '10px sans-serif';
  ctx.fillText('Valor Actual (%)', padL + 14, 15);

  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(padL + 112, 6, 10, 10);
  ctx.fillStyle = '#334155';
  ctx.fillText('Línea Base (Sin dato / Pendiente)', padL + 126, 15);

  return canvas.toDataURL('image/png');
}

function renderIso37000DonutImage(principles: IsoPrinciple[]): string {
  const { canvas, ctx } = createCanvas(360, 220);
  const outcomes = calculateIso37000Outcomes(principles);
  const colors = ['#2E93FA', '#FA5C7C', '#FF8A3D'];

  const total = outcomes.reduce((sum, o) => sum + o.percentage, 0) || 1;
  const cx = 92;
  const cy = 112;
  const outerR = 68;
  const innerR = 40;

  let startAngle = -Math.PI / 2;
  outcomes.forEach((item, idx) => {
    const slice = (item.percentage / total) * Math.PI * 2;
    const endAngle = startAngle + slice;

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = colors[idx % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    startAngle = endAngle;
  });

  // Center avg label
  const avgPct = Math.round(total / outcomes.length);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${avgPct}%`, cx, cy + 4);
  ctx.fillStyle = '#64748B';
  ctx.font = '9px sans-serif';
  ctx.fillText('Promedio', cx, cy + 16);

  // Right legend with exact percentages
  ctx.textAlign = 'left';
  outcomes.forEach((item, idx) => {
    const y = 66 + idx * 44;
    ctx.fillStyle = colors[idx % colors.length];
    ctx.beginPath();
    ctx.arc(188, y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(item.outcome, 200, y + 4);

    ctx.fillStyle = '#475569';
    ctx.font = '10px sans-serif';
    ctx.fillText(
      `Nota ${item.avgScore.toFixed(2)}/5 · ${item.percentage}% madurez`,
      200,
      y + 18
    );
  });

  return canvas.toDataURL('image/png');
}

function renderIso38500PrinciplesImage(principles: IsoPrinciple[]): string {
  const { canvas, ctx, width } = createCanvas(440, 220);
  const colors = [
    '#2E93FA',
    '#FFC845',
    '#FA5C7C',
    '#44B7B2',
    '#5F3DF5',
    '#62B834',
  ];

  const padL = 132;
  const padR = 54;
  const padT = 18;
  const barH = 18;
  const rowGap = 31;
  const maxBarW = width - padL - padR;

  principles.forEach((p, idx) => {
    const y = padT + idx * rowGap;
    const pct = Math.round((p.estimated_score / 5) * 100);
    const barW = (p.estimated_score / 5) * maxBarW;

    // Label
    ctx.fillStyle = '#334155';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${p.name} (${p.code})`, padL - 10, y + 13);

    // Track
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(padL, y, maxBarW, barH, 4);
    ctx.fill();

    // Fill
    ctx.fillStyle = colors[idx % colors.length];
    ctx.beginPath();
    ctx.roundRect(padL, y, barW, barH, 4);
    ctx.fill();

    // Value label
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 10.5px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${p.estimated_score}/5 (${pct}%)`, padL + maxBarW + 8, y + 13);
  });

  return canvas.toDataURL('image/png');
}

function renderTrendLineChartImage(
  assessment: GovernanceAssessment,
  indicators: MetiIndicator[]
): string {
  const { canvas, ctx, width, height } = createCanvas(520, 220);
  const meti03 = indicators.find((i) => i.code === 'METI03');
  const meti01 = indicators.find((i) => i.code === 'METI01');

  const points = SEED_MONTHLY_TRENDS.map((pt, idx) => {
    const isLast = idx === SEED_MONTHLY_TRENDS.length - 1;
    return {
      label: pt.month.replace('20', ''),
      gobierno: isLast
        ? Number(assessment.self_assessment_score.toFixed(1))
        : pt.gobierno_ti_pct,
      seguridad: isLast
        ? meti03?.current_value ?? pt.seguridad_datos_pct
        : pt.seguridad_datos_pct,
      nubeIA: isLast
        ? meti01?.current_value ?? 55
        : Number((38 + idx * 1.5).toFixed(1)),
    };
  });

  const padL = 40;
  const padR = 16;
  const padT = 28;
  const padB = 34;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const minY = 30;
  const maxY = 75;

  const getY = (val: number) =>
    padT + chartH - ((val - minY) / (maxY - minY)) * chartH;

  // Grid
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'right';

  [30, 45, 60, 75].forEach((val) => {
    const y = getY(val);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(width - padR, y);
    ctx.stroke();
    ctx.fillText(`${val}%`, padL - 6, y + 3);
  });

  const drawSeries = (
    key: 'gobierno' | 'seguridad' | 'nubeIA',
    color: string,
    fillGradient: boolean
  ) => {
    const coords = points.map((pt, idx) => ({
      x: padL + (idx / (points.length - 1)) * chartW,
      y: getY(pt[key]),
    }));

    if (fillGradient) {
      const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, 'rgba(95, 61, 245, 0.22)');
      grad.addColorStop(1, 'rgba(95, 61, 245, 0.01)');
      ctx.beginPath();
      ctx.moveTo(coords[0].x, padT + chartH);
      coords.forEach((c) => ctx.lineTo(c.x, c.y));
      ctx.lineTo(coords[coords.length - 1].x, padT + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    coords.forEach((c, idx) => {
      if (idx === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.stroke();

    coords.forEach((c) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    });
  };

  drawSeries('gobierno', '#5F3DF5', true);
  drawSeries('seguridad', '#2E93FA', false);
  drawSeries('nubeIA', '#FFC845', false);

  // X labels
  ctx.fillStyle = '#64748B';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  points.forEach((pt, idx) => {
    if (idx % 2 === 0 || idx === points.length - 1) {
      const x = padL + (idx / (points.length - 1)) * chartW;
      ctx.fillText(pt.label, x, padT + chartH + 15);
    }
  });

  // Legend
  ctx.textAlign = 'left';
  const legends = [
    { label: `Gobierno TI (${points[11].gobierno}%)`, color: '#5F3DF5', x: padL },
    { label: `METI03 Datos (${points[11].seguridad}%)`, color: '#2E93FA', x: padL + 135 },
    { label: `METI01 Nube IA (${points[11].nubeIA}%)`, color: '#FFC845', x: padL + 272 },
  ];
  legends.forEach((lg) => {
    ctx.fillStyle = lg.color;
    ctx.fillRect(lg.x, 7, 10, 10);
    ctx.fillStyle = '#334155';
    ctx.font = '10px sans-serif';
    ctx.fillText(lg.label, lg.x + 14, 15);
  });

  return canvas.toDataURL('image/png');
}

function renderPortfolioCopImage(initiatives: Initiative[]): string {
  const { canvas, ctx, width } = createCanvas(440, 210);
  const groups = [
    { label: 'Seguridad y Ley 1581', codes: ['B001', 'B002', 'B006'], color: '#44B7B2' },
    { label: 'EDM, ROI y Talento', codes: ['B008', 'B009', 'B010'], color: '#5F3DF5' },
    { label: 'MLOps y Librerías', codes: ['B003', 'B007'], color: '#2E93FA' },
    { label: 'FinOps y Adquisiciones', codes: ['B004', 'B005'], color: '#FFC845' },
    { label: 'Cultura Ética y SLA', codes: ['B011', 'B012'], color: '#FA5C7C' },
  ];

  const rows = groups.map((g) => {
    const matched = initiatives.filter((i) => g.codes.includes(i.code));
    const budgetUsd = matched.reduce((s, i) => s + i.estimated_cost_usd, 0);
    const copM = Number((convertUsdToCop(budgetUsd) / 1_000_000).toFixed(1));
    const pct = Number(((matched.length / initiatives.length) * 100).toFixed(1));
    return { ...g, copM, pct, count: matched.length };
  });

  const maxCop = Math.max(...rows.map((r) => r.copM), 1);
  const padL = 135;
  const padR = 96;
  const padT = 18;
  const barH = 20;
  const rowGap = 35;
  const maxBarW = width - padL - padR;

  rows.forEach((r, idx) => {
    const y = padT + idx * rowGap;
    const barW = (r.copM / maxCop) * maxBarW;

    ctx.fillStyle = '#334155';
    ctx.font = '10.5px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(r.label, padL - 10, y + 14);

    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(padL, y, maxBarW, barH, 4);
    ctx.fill();

    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.roundRect(padL, y, barW, barH, 4);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`$${r.copM}M (${r.pct}%)`, padL + maxBarW + 8, y + 14);
  });

  return canvas.toDataURL('image/png');
}

export function exportGovernancePdfReport({
  assessment,
  principles,
  indicators,
  initiatives,
  risks,
}: PdfExportPayload) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth(); // 297mm
  const pageH = doc.internal.pageSize.getHeight(); // 210mm
  const margin = 12;

  const petiSummary = calculatePetiSummary(indicators);
  const meti02 = indicators.find((i) => i.code === 'METI02');
  const totalBudgetUsd = initiatives.reduce((s, i) => s + i.estimated_cost_usd, 0);
  const todayStr = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // =========================================================================
  // PÁGINA 1: RESUMEN EJECUTIVO GRÁFICO CON KPIs Y GRÁFICOS
  // =========================================================================
  doc.setFillColor(20, 17, 46); // #14112E
  doc.rect(0, 0, pageW, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('DAnalytics · Resumen Ejecutivo Gráfico de Gobierno de TI', margin, 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `ISO/IEC 38500:2024 & ISO 37000 · Madurez CEIPA: ${assessment.digital_maturity_ceipa} · Estimación documental – no auditada`,
    margin,
    15.5
  );
  doc.text(`Generado: ${todayStr}`, pageW - margin, 15.5, { align: 'right' });

  // 5 Tarjetas KPI superiores
  const kpis = [
    {
      value: `${assessment.self_assessment_score.toFixed(2)}%`,
      badge: assessment.assessment_level,
      label: 'Autoevaluación Gobierno TI',
      badgeBg: [209, 250, 229] as const,
      badgeText: [6, 95, 70] as const,
    },
    {
      value: `${petiSummary.avgProgress}%`,
      badge: `${petiSummary.reportedCount}/${petiSummary.total} reportados`,
      label: 'Avance General PETI (Año 1)',
      badgeBg: [209, 250, 229] as const,
      badgeText: [6, 95, 70] as const,
    },
    {
      value: `${meti02?.current_value ?? meti02?.baseline_value ?? 9} sem`,
      badge: '-10.0% vs Base',
      label: 'Despliegue MLOps (METI02)',
      badgeBg: [209, 250, 229] as const,
      badgeText: [6, 95, 70] as const,
    },
    {
      value: `${assessment.data_protection_score.toFixed(1)}%`,
      badge: 'Brecha Crítica',
      label: 'Protección de Datos (Ley 1581)',
      badgeBg: [254, 226, 226] as const,
      badgeText: [153, 27, 27] as const,
    },
    {
      value: formatCurrencyCOPCompact(totalBudgetUsd),
      badge: `${initiatives.length} iniciativas`,
      label: 'Portafolio B001–B012 (COP)',
      badgeBg: [224, 231, 255] as const,
      badgeText: [55, 48, 163] as const,
    },
  ];

  const kpiGap = 3.5;
  const kpiW = (pageW - margin * 2 - kpiGap * 4) / 5;
  const kpiY = 24;
  const kpiH = 20;

  kpis.forEach((k, idx) => {
    const x = margin + idx * (kpiW + kpiGap);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, kpiY, kpiW, kpiH, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(k.value, x + 3, kpiY + 8);

    doc.setFillColor(k.badgeBg[0], k.badgeBg[1], k.badgeBg[2]);
    doc.roundedRect(x + kpiW - 22, kpiY + 3.2, 19.5, 5.5, 1, 1, 'F');
    doc.setTextColor(k.badgeText[0], k.badgeText[1], k.badgeText[2]);
    doc.setFontSize(6.5);
    doc.text(k.badge, x + kpiW - 12.25, kpiY + 6.9, { align: 'center' });

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(k.label, x + 3, kpiY + 15.5);
  });

  // Gráficos Fila 1 (3 paneles)
  const metiChartImg = renderMetiBarChartImage(indicators);
  const iso37000Img = renderIso37000DonutImage(principles);
  const iso38500Img = renderIso38500PrinciplesImage(principles);
  const trendImg = renderTrendLineChartImage(assessment, indicators);
  const portfolioImg = renderPortfolioCopImage(initiatives);

  const row1Y = 48;
  const row1H = 71;
  const colW3 = (pageW - margin * 2 - 8) / 3;

  // Panel 1: METI Bars
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, row1Y, colW3 + 10, row1H, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('Indicadores Estratégicos PETI (%)', margin + 3, row1Y + 6);
  doc.addImage(metiChartImg, 'PNG', margin + 2, row1Y + 8, colW3 + 6, row1H - 10);

  // Panel 2: ISO 37000 Donut
  const p2X = margin + colW3 + 14;
  const p2W = colW3 - 10;
  doc.roundedRect(p2X, row1Y, p2W, row1H, 2, 2, 'S');
  doc.text('Resultados ISO 37000 (%)', p2X + 3, row1Y + 6);
  doc.addImage(iso37000Img, 'PNG', p2X + 2, row1Y + 9, p2W - 4, row1H - 12);

  // Panel 3: ISO 38500 Principles
  const p3X = p2X + p2W + 4;
  const p3W = pageW - margin - p3X;
  doc.roundedRect(p3X, row1Y, p3W, row1H, 2, 2, 'S');
  doc.text('Principios ISO 38500 (Escala 1–5 y %)', p3X + 3, row1Y + 6);
  doc.addImage(iso38500Img, 'PNG', p3X + 2, row1Y + 9, p3W - 4, row1H - 12);

  // Gráficos Fila 2 (2 paneles)
  const row2Y = 123;
  const row2H = 74;
  const leftW2 = (pageW - margin * 2 - 4) * 0.54;
  const rightW2 = pageW - margin * 2 - 4 - leftW2;

  doc.roundedRect(margin, row2Y, leftW2, row2H, 2, 2, 'S');
  doc.text('Evolución 12 Meses: Gobierno TI, Seguridad/Datos y Nube IA (%)', margin + 3, row2Y + 6);
  doc.addImage(trendImg, 'PNG', margin + 2, row2Y + 9, leftW2 - 4, row2H - 12);

  const r2X = margin + leftW2 + 4;
  doc.roundedRect(r2X, row2Y, rightW2, row2H, 2, 2, 'S');
  doc.text('Portafolio B001–B012: Inversión en Millones COP y %', r2X + 3, row2Y + 6);
  doc.addImage(portfolioImg, 'PNG', r2X + 2, row2Y + 9, rightW2 - 4, row2H - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `DAnalytics · Página 1 de 2 · Moneda convertida a Pesos Colombianos (TRM ref. $4.200 COP/USD)`,
    margin,
    pageH - 5
  );

  // =========================================================================
  // PÁGINA 2: TABLAS DETALLADAS DE PORCENTAJES, METI, PORTAFOLIO COP Y RIESGOS
  // =========================================================================
  doc.addPage('a4', 'landscape');
  doc.setFillColor(20, 17, 46);
  doc.rect(0, 0, pageW, 14, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DAnalytics · Detalle de Indicadores PETI, Principios ISO 38500 y Portafolio (COP)', margin, 9);

  // Tabla 1: Indicadores PETI (METI01 - METI10)
  let y = 21;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text('Indicadores Estratégicos PETI (METI01–METI10)', margin, y);
  y += 4;

  // Cabecera tabla METI
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageW - margin * 2, 6.5, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Código', margin + 2, y + 4.5);
  doc.text('Indicador', margin + 20, y + 4.5);
  doc.text('Base', margin + 108, y + 4.5);
  doc.text('Actual', margin + 130, y + 4.5);
  doc.text('Año 1', margin + 166, y + 4.5);
  doc.text('Año 2', margin + 186, y + 4.5);
  doc.text('Año 3', margin + 206, y + 4.5);
  doc.text('Semáforo / Estado', margin + 228, y + 4.5);
  y += 6.5;

  doc.setFont('helvetica', 'normal');
  indicators.forEach((ind, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageW - margin * 2, 6, 'F');
    }
    const ev = evaluateMetiIndicator(ind);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(ind.code, margin + 2, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(ind.name.slice(0, 48), margin + 20, y + 4.2);
    doc.text(`${ind.baseline_value} ${ind.unit}`, margin + 108, y + 4.2);
    doc.text(
      ind.current_value !== null ? `${ind.current_value} ${ind.unit}` : 'Sin dato',
      margin + 130,
      y + 4.2
    );
    doc.text(`${ind.year_1_target} ${ind.unit}`, margin + 166, y + 4.2);
    doc.text(`${ind.year_2_target} ${ind.unit}`, margin + 186, y + 4.2);
    doc.text(`${ind.year_3_target} ${ind.unit}`, margin + 206, y + 4.2);
    doc.text(ev.label, margin + 228, y + 4.2);
    y += 6;
  });

  // Tabla 2: Portafolio B001–B012 en COP (2 columnas compactas debajo)
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Portafolio de Iniciativas B001–B012 · Total: ${formatCurrencyCOP(totalBudgetUsd)} COP`,
    margin,
    y
  );
  y += 4;

  const halfW = (pageW - margin * 2 - 4) / 2;
  initiatives.forEach((init, idx) => {
    const col = idx < 6 ? 0 : 1;
    const row = idx % 6;
    const rx = margin + col * (halfW + 4);
    const ry = y + row * 7.2;

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(rx, ry, halfW, 6.2, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(46, 147, 250);
    doc.text(init.code, rx + 2, ry + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(init.title.slice(0, 44), rx + 13, ry + 4.2);

    doc.setFont('helvetica', 'bold');
    doc.text(
      `${formatCurrencyCOP(init.estimated_cost_usd)} COP`,
      rx + halfW - 22,
      ry + 4.2,
      { align: 'right' }
    );
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(init.status, rx + halfW - 2, ry + 4.2, { align: 'right' });
  });

  // Pie página 2 con alerta Ley 1581
  const criticalRisk = risks.find((r) => r.compliance_score === 0);
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28);
  if (criticalRisk) {
    doc.text(
      `Alerta Crítica: ${criticalRisk.code} · ${criticalRisk.title} (${criticalRisk.compliance_score}% cumplimiento)`,
      margin,
      pageH - 9
    );
  }
  doc.setTextColor(100, 116, 139);
  doc.text(
    `DAnalytics · Página 2 de 2 · Documento generado automáticamente desde el Dashboard ISO/IEC 38500:2024`,
    margin,
    pageH - 4.5
  );

  doc.save('DAnalytics_Resumen_Ejecutivo_ISO38500.pdf');
}
