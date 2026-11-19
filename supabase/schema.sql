-- ============================================================================
-- DAnalytics · Esquema PostgreSQL / Supabase para Gobierno de TI
-- Norma Internacional ISO/IEC 38500:2024 e ISO 37000
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Evaluación General de Gobierno (EDM / Nivel de Madurez)
CREATE TABLE IF NOT EXISTS governance_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_name VARCHAR(100) DEFAULT 'DAnalytics',
    assessment_level VARCHAR(50) NOT NULL DEFAULT 'Level 3 - Defined',
    self_assessment_score NUMERIC(5,2) NOT NULL DEFAULT 61.29,
    digital_maturity_ceipa VARCHAR(50) DEFAULT 'Intermedio - En Desarrollo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Principios ISO 38500 (Evaluación Cualitativa / Estimación)
CREATE TABLE IF NOT EXISTS iso_principles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    estimated_score INTEGER CHECK (estimated_score BETWEEN 1 AND 5),
    evidence TEXT,
    gap_description TEXT,
    recommendation TEXT,
    confidence_level VARCHAR(20) CHECK (confidence_level IN ('Alta', 'Media', 'Baja')),
    is_audited BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indicadores Estratégicos PETI (METI01 - METI10)
CREATE TABLE IF NOT EXISTS meti_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    baseline_value NUMERIC(10,2) NOT NULL,
    year_1_target NUMERIC(10,2) NOT NULL,
    year_2_target NUMERIC(10,2) NOT NULL,
    year_3_target NUMERIC(10,2) NOT NULL,
    current_value NUMERIC(10,2) NULL,
    unit VARCHAR(20) NOT NULL,
    direction VARCHAR(20) CHECK (direction IN ('higher_is_better', 'lower_is_better')),
    frequency VARCHAR(50) NOT NULL,
    responsible_role VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Portafolio de Iniciativas y Brechas (B001 - B012)
CREATE TABLE IF NOT EXISTS initiatives_portfolio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    related_objective VARCHAR(255),
    estimated_cost_usd NUMERIC(12,2),
    duration_months INTEGER,
    priority VARCHAR(20) CHECK (priority IN ('Alta', 'Media', 'Baja')),
    status VARCHAR(30) DEFAULT 'Por validar' CHECK (status IN ('Por validar', 'En Planificación', 'En Ejecución', 'Completado')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE governance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE iso_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meti_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives_portfolio ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública y escritura autenticada
CREATE POLICY "Allow public read" ON governance_assessments FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON iso_principles FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON meti_indicators FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON initiatives_portfolio FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update" ON iso_principles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON meti_indicators FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON initiatives_portfolio FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- Datos Semilla (DAnalytics / ISO 38500:2024)
-- ============================================================================

INSERT INTO governance_assessments (organization_name, assessment_level, self_assessment_score, digital_maturity_ceipa)
VALUES ('DAnalytics', 'Level 3 - Defined', 61.29, 'Intermedio - En Desarrollo')
ON CONFLICT DO NOTHING;

INSERT INTO iso_principles (code, name, estimated_score, evidence, gap_description, recommendation, confidence_level, is_audited) VALUES
('RESP', 'Responsabilidad', 3, 'Matriz RACI definida en proyectos clave de analítica e IA; roles de liderazgo técnico asignados.', 'Falta formalización de comités ejecutivos de gobierno de datos y rendición de cuentas en adquisiciones cloud.', 'Establecer Comité Trimestral de Gobierno TI con actas y responsables por dominio ISO 38500.', 'Media', FALSE),
('ESTR', 'Estrategia', 3, 'PETI alineado con objetivos de crecimiento en soluciones de analítica avanzada y MLOps.', 'Desconexión parcial entre la hoja de ruta técnica y métricas financieras de ROI por cliente.', 'Vincular cada iniciativa PETI (METI01-METI10) con casos de negocio y revisión semestral de portafolio.', 'Media', FALSE),
('ADQ', 'Adquisición', 2, 'Evaluación técnica básica de proveedores cloud y licenciamiento de software analítico.', 'Ausencia de criterios estandarizados de seguridad, privacidad Ley 1581 y FinOps en compras de TI.', 'Implementar política formal de adquisiciones TI con cláusulas SLA, cifrado y control presupuestario cloud.', 'Baja', FALSE),
('DES', 'Desempeño', 3, 'Seguimiento operativo de entregas sprint y cumplimiento de SLA de soporte técnico.', 'Medición incompleta de indicadores estratégicos METI y tiempos de despliegue MLOps.', 'Automatizar tablero de indicadores PETI con cadencia mensual/trimestral y umbrales de alerta.', 'Media', FALSE),
('CONF', 'Conformidad', 2, 'Controles iniciales de respaldo y cifrado en infraestructura productiva.', 'Puntaje crítico (0) en evaluación formal de Protección de Datos / Ley 1581 y auditoría documental pendiente.', 'Ejecutar programa urgente de adecuación a Ley 1581, anonimización de datos y auditoría ISO 38500.', 'Alta', FALSE),
('COMP', 'Comportamiento Humano', 3, 'Cultura técnica colaborativa y programas iniciales de certificación en IA/MLOps.', 'Falta programa estructurado de ética en IA, gestión del cambio y sensibilización en privacidad de datos.', 'Desplegar ruta obligatoria de ética en datos, seguridad de la información y adopción de buenas prácticas.', 'Media', FALSE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO meti_indicators (code, name, baseline_value, year_1_target, year_2_target, year_3_target, current_value, unit, direction, frequency, responsible_role) VALUES
('METI01', 'Proyectos IA en nube segura', 40.00, 70.00, 90.00, 100.00, 55.00, '%', 'higher_is_better', 'Trimestral', 'Arquitecto Cloud & Seguridad'),
('METI02', 'Tiempo promedio de despliegue MLOps', 10.00, 8.00, 6.00, 4.00, 9.00, 'semanas', 'lower_is_better', 'Mensual', 'Líder MLOps & DevOps'),
('METI03', 'Cumplimiento protocolo seguridad/datos', 60.00, 80.00, 90.00, 100.00, 62.00, '%', 'higher_is_better', 'Trimestral', 'Oficial de Seguridad (CISO)'),
('METI04', 'Backup y cifrado en activos críticos', 75.00, 85.00, 95.00, 100.00, 82.00, '%', 'higher_is_better', 'Mensual', 'Líder de Infraestructura'),
('METI05', 'Equipo certificado en IA/MLOps', 50.00, 75.00, 95.00, 100.00, NULL, '%', 'higher_is_better', 'Semestral', 'Dirección de Talento & TI'),
('METI06', 'Reutilización de librerías internas', 20.00, 40.00, 60.00, 80.00, 28.00, '%', 'higher_is_better', 'Trimestral', 'Líder de Ingeniería IA'),
('METI07', 'Soluciones con ROI medido', 50.00, 75.00, 90.00, 100.00, NULL, '%', 'higher_is_better', 'Semestral', 'Gerente de Producto & PMO'),
('METI08', 'Reducción costos cloud FinOps', 0.00, 10.00, 15.00, 20.00, 6.50, '%', 'higher_is_better', 'Mensual', 'FinOps & Arquitectura Cloud'),
('METI09', 'Cumplimiento SLA soporte', 85.00, 90.00, 95.00, 98.00, 91.00, '%', 'higher_is_better', 'Mensual', 'Líder de Operaciones & Soporte'),
('METI10', 'Satisfacción clientes (CSAT)', 80.00, 88.00, 92.00, 95.00, NULL, '%', 'higher_is_better', 'Semestral', 'Dirección de Servicio al Cliente')
ON CONFLICT (code) DO NOTHING;

INSERT INTO initiatives_portfolio (code, title, related_objective, estimated_cost_usd, duration_months, priority, status) VALUES
('B001', 'Programa de Cumplimiento Ley 1581 y Protección de Datos', 'Cerrar brecha crítica de privacidad (puntaje 0) en bases de datos y pipelines de analítica', 18500.00, 4, 'Alta', 'Por validar'),
('B002', 'Arquitectura Landing Zone Cloud Segura para Proyectos IA', 'Elevar proyectos IA en nube segura al 70% en Año 1 (METI01)', 24000.00, 5, 'Alta', 'Por validar'),
('B003', 'Estandarización de Pipelines CI/CD y MLOps', 'Reducir el tiempo promedio de despliegue de 10 a 8 semanas (METI02)', 16000.00, 4, 'Alta', 'Por validar'),
('B004', 'Marco FinOps y Gobierno de Costos Cloud', 'Optimizar consumo de cómputo y GPU en un 10% durante Año 1 (METI08)', 9500.00, 3, 'Alta', 'Por validar'),
('B005', 'Política de Adquisiciones TI y Homologación de Proveedores', 'Subir madurez del principio Adquisición (2/5 -> 4/5) con criterios de riesgo', 7200.00, 3, 'Media', 'Por validar'),
('B006', 'Cifrado Integral, KMS y Automatización de Backups', 'Garantizar 85%-100% de activos críticos cifrados y respaldados (METI04)', 12500.00, 3, 'Alta', 'Por validar'),
('B007', 'Repositorio Corporativo y Librerías Reutilizables de Analítica', 'Incrementar reutilización de librerías del 20% al 40% (METI06)', 11000.00, 4, 'Media', 'Por validar'),
('B008', 'Sistema de Medición de ROI por Solución de IA', 'Asegurar trazabilidad de valor de negocio en 75% de soluciones (METI07)', 8400.00, 3, 'Media', 'Por validar'),
('B009', 'Plan de Certificación Técnica en IA, Cloud y MLOps', 'Alcanzar 75% del equipo técnico certificado en Año 1 (METI05)', 14200.00, 6, 'Media', 'Por validar'),
('B010', 'Comité Ejecutivo de Gobierno TI (Ciclo EDM) y Auditoría ISO 38500', 'Formalizar auditoría documental e incrementar madurez EDM sobre Level 3', 10500.00, 4, 'Alta', 'Por validar'),
('B011', 'Programa de Ética en IA, Cultura de Datos y Gestión del Cambio', 'Fortalecer principio Comportamiento Humano y resultado ético ISO 37000', 6800.00, 4, 'Baja', 'Por validar'),
('B012', 'Mesa de Servicio Automatizada y Gestión Proactiva de SLA', 'Sostener cumplimiento SLA de soporte >= 90% y elevar CSAT (METI09/METI10)', 9000.00, 3, 'Baja', 'Por validar')
ON CONFLICT (code) DO NOTHING;
