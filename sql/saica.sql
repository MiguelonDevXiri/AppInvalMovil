-- =============================================
-- Tablas para el módulo de Informes Saica
-- =============================================

-- Tabla principal de inspecciones de informes Saica
CREATE TABLE IF NOT EXISTS saica_inspections (
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
  ot_number TEXT,
  notes TEXT,
  safety_checklist JSONB,
  reviewed_by TEXT,
  technician_name TEXT,
  technician_signature TEXT,
  client_signature_name TEXT,
  client_signature TEXT,
  -- Intervención / Solución
  solucion_description TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cada informe Saica individual detectada
CREATE TABLE IF NOT EXISTS saica_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES saica_inspections(id) ON DELETE CASCADE,
  description TEXT,
  comment TEXT,
  proposed_solution TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fotos de cada informe Saica individual
CREATE TABLE IF NOT EXISTS saica_intervention_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES saica_interventions(id) ON DELETE CASCADE,
  inspection_id UUID NOT NULL REFERENCES saica_inspections(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fotos generales y de solución
CREATE TABLE IF NOT EXISTS saica_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES saica_inspections(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL, -- 'general', 'solucion'
  position TEXT, -- 'photoGeneral1'..'photoGeneral4' para generales
  photo_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Materiales utilizados
CREATE TABLE IF NOT EXISTS saica_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES saica_inspections(id) ON DELETE CASCADE,
  name TEXT,
  quantity TEXT,
  reference TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_saica_interventions_inspection ON saica_interventions(inspection_id);
CREATE INDEX IF NOT EXISTS idx_saica_intervention_photos_intervention ON saica_intervention_photos(intervention_id);
CREATE INDEX IF NOT EXISTS idx_saica_intervention_photos_inspection ON saica_intervention_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_saica_photos_inspection ON saica_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_saica_materials_inspection ON saica_materials(inspection_id);

-- RLS (Row Level Security) - desactivar si no se usa auth
ALTER TABLE saica_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE saica_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saica_intervention_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE saica_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE saica_materials ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (anon puede todo, ajustar según necesidad)
CREATE POLICY "saica_inspections_all" ON saica_inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "saica_interventions_all" ON saica_interventions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "saica_intervention_photos_all" ON saica_intervention_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "saica_photos_all" ON saica_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "saica_materials_all" ON saica_materials FOR ALL USING (true) WITH CHECK (true);
