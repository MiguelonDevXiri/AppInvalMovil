-- =============================================
-- Tablas para el módulo de Averías
-- =============================================

-- Tabla principal de inspecciones de averías
CREATE TABLE IF NOT EXISTS averias_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  aviso_date TEXT,
  aviso_time TEXT,
  location TEXT,
  requested_by TEXT,
  machine_type TEXT NOT NULL,
  machine_brand TEXT,
  machine_model TEXT,
  serial_number TEXT,
  license_plate TEXT,
  -- Intervención / Solución
  solucion_description TEXT,
  -- Firmas
  technician_name TEXT,
  technician_signature TEXT,
  client_signature_name TEXT,
  client_signature TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cada avería individual detectada
CREATE TABLE IF NOT EXISTS averias_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES averias_inspections(id) ON DELETE CASCADE,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fotos de cada avería individual
CREATE TABLE IF NOT EXISTS averias_defect_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES averias_defects(id) ON DELETE CASCADE,
  inspection_id UUID NOT NULL REFERENCES averias_inspections(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fotos generales y de solución
CREATE TABLE IF NOT EXISTS averias_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES averias_inspections(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL, -- 'general', 'solucion'
  position TEXT, -- 'photoGeneral1'..'photoGeneral4' para generales
  photo_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Materiales utilizados
CREATE TABLE IF NOT EXISTS averias_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES averias_inspections(id) ON DELETE CASCADE,
  name TEXT,
  quantity TEXT,
  reference TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_averias_defects_inspection ON averias_defects(inspection_id);
CREATE INDEX IF NOT EXISTS idx_averias_defect_photos_defect ON averias_defect_photos(defect_id);
CREATE INDEX IF NOT EXISTS idx_averias_defect_photos_inspection ON averias_defect_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_averias_photos_inspection ON averias_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_averias_materials_inspection ON averias_materials(inspection_id);

-- RLS (Row Level Security) - desactivar si no se usa auth
ALTER TABLE averias_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE averias_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE averias_defect_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE averias_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE averias_materials ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (anon puede todo, ajustar según necesidad)
CREATE POLICY "averias_inspections_all" ON averias_inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "averias_defects_all" ON averias_defects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "averias_defect_photos_all" ON averias_defect_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "averias_photos_all" ON averias_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "averias_materials_all" ON averias_materials FOR ALL USING (true) WITH CHECK (true);
