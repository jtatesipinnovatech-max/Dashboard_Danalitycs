-- Tablas para el modelo de ingesta CIO (migrado desde flujo n8n DAnalytics)
-- Opcional: ejecutar en Supabase / PostgreSQL si se desea persistencia en nube.

CREATE TABLE IF NOT EXISTS indicadores_cio (
  id BIGSERIAL PRIMARY KEY,
  indicador TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  fecha DATE NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS madurez_ceipa (
  id BIGSERIAL PRIMARY KEY,
  dimension TEXT NOT NULL,
  nivel TEXT NOT NULL,
  fecha_evaluacion DATE NOT NULL,
  fuente TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS objetivos_estrategicos (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  fecha_objetivo DATE,
  estado TEXT DEFAULT 'sin_evaluar',
  fuente TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS iniciativas_ti (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  objetivo_codigo TEXT NOT NULL REFERENCES objetivos_estrategicos(codigo),
  nombre TEXT NOT NULL,
  trimestre INTEGER CHECK (trimestre BETWEEN 1 AND 4),
  anio INTEGER,
  estado TEXT DEFAULT 'sin_evaluar',
  fuente TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS factores_dofa (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  requiere_validacion BOOLEAN DEFAULT FALSE,
  fuente TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bsc_diagnostico (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  dimension TEXT NOT NULL,
  pregunta TEXT NOT NULL,
  puntuacion INTEGER,
  fecha_evaluacion DATE,
  fuente TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuerzas_porter (
  codigo TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  intensidad TEXT,
  fuente TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actividades_cadena_valor (
  codigo TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  proceso TEXT NOT NULL,
  actividad TEXT NOT NULL,
  orden_proceso INTEGER NOT NULL,
  orden_actividad INTEGER NOT NULL,
  fuente TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mapa_estrategico (
  numero INTEGER PRIMARY KEY,
  perspectiva TEXT NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NOT NULL,
  estado TEXT DEFAULT 'sin_evaluar',
  fuente TEXT NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modelo_negocio_ti (
  codigo VARCHAR(12) PRIMARY KEY,
  bloque TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  orden_elemento INTEGER NOT NULL,
  fuente VARCHAR(150) NOT NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kpi_mediciones (
  id BIGSERIAL PRIMARY KEY,
  kpi_codigo TEXT NOT NULL,
  periodo DATE NOT NULL,
  numerador INTEGER NOT NULL,
  denominador INTEGER,
  fuente TEXT NOT NULL,
  evidencia TEXT,
  registrado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (kpi_codigo, periodo)
);

CREATE TABLE IF NOT EXISTS iso38500_evaluaciones (
  id BIGSERIAL PRIMARY KEY,
  principio_codigo TEXT NOT NULL,
  fecha_evaluacion DATE NOT NULL,
  nivel INTEGER CHECK (nivel BETWEEN 0 AND 4),
  evidencia TEXT NOT NULL,
  fuente TEXT NOT NULL,
  evaluador TEXT NOT NULL,
  observaciones TEXT,
  registrado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (principio_codigo, fecha_evaluacion)
);
