-- =============================================
-- Tablas para el módulo de Instalaciones
-- =============================================

CREATE TABLE IF NOT EXISTS instalaciones_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  aviso_date TEXT,
  aviso_time TEXT,
  location TEXT,
  reviewed_by TEXT,
  machine_type TEXT NOT NULL,
  machine_brand TEXT,
  machine_model TEXT,
  serial_number TEXT,
  license_plate TEXT,
  ot_number TEXT,
  work_description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instalaciones_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES instalaciones_inspections(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL, -- 'site', 'final'
  position TEXT,
  photo_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS instalaciones_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES instalaciones_inspections(id) ON DELETE CASCADE,
  name TEXT,
  quantity TEXT,
  reference TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE instalaciones_inspections ADD COLUMN IF NOT EXISTS machine_works_correctly BOOLEAN;
ALTER TABLE instalaciones_inspections ADD COLUMN IF NOT EXISTS machine_works_correctly_reason TEXT;
ALTER TABLE instalaciones_inspections ADD COLUMN IF NOT EXISTS machine_stays_running BOOLEAN;
ALTER TABLE instalaciones_inspections ADD COLUMN IF NOT EXISTS machine_stays_running_reason TEXT;
ALTER TABLE instalaciones_inspections ADD COLUMN IF NOT EXISTS pressures_checked BOOLEAN;
ALTER TABLE instalaciones_inspections ADD COLUMN IF NOT EXISTS pressures_checked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_instalaciones_photos_inspection ON instalaciones_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_materials_inspection ON instalaciones_materials(inspection_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_inspections_created_at ON instalaciones_inspections(created_at DESC);

ALTER TABLE instalaciones_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE instalaciones_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE instalaciones_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instalaciones_inspections_all" ON instalaciones_inspections;
DROP POLICY IF EXISTS "instalaciones_photos_all" ON instalaciones_photos;
DROP POLICY IF EXISTS "instalaciones_materials_all" ON instalaciones_materials;

CREATE POLICY "instalaciones_inspections_all" ON instalaciones_inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "instalaciones_photos_all" ON instalaciones_photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "instalaciones_materials_all" ON instalaciones_materials FOR ALL USING (true) WITH CHECK (true);
