-- =============================================
-- Tablas para el módulo de Reparaciones Taller
-- =============================================

CREATE TABLE IF NOT EXISTS reparaciones_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  aviso_date TEXT,
  aviso_time TEXT,
  location TEXT,
  reviewed_by TEXT,
  machine_type TEXT,
  machine_brand TEXT,
  machine_model TEXT,
  serial_number TEXT,
  license_plate TEXT,
  ot_number TEXT,
  notes TEXT,
  safety_checklist JSONB,
  exit_status TEXT DEFAULT 'pending',
  exit_notes TEXT,
  exit_reviewed_by TEXT,
  exit_completed_at TIMESTAMPTZ,
  pdf_url TEXT,
  exit_pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS ot_number TEXT;
ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS safety_checklist JSONB;
ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS exit_status TEXT DEFAULT 'pending';
ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS exit_notes TEXT;
ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS exit_reviewed_by TEXT;
ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS exit_completed_at TIMESTAMPTZ;
ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS exit_pdf_url TEXT;
ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE reparaciones_inspections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS reparaciones_repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES reparaciones_inspections(id) ON DELETE CASCADE,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reparaciones_general_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES reparaciones_inspections(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reparaciones_repair_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES reparaciones_inspections(id) ON DELETE CASCADE,
  repair_id UUID NOT NULL REFERENCES reparaciones_repairs(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reparaciones_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES reparaciones_inspections(id) ON DELETE CASCADE,
  name TEXT,
  quantity TEXT,
  reference TEXT,
  available BOOLEAN,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reparaciones_exit_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES reparaciones_inspections(id) ON DELETE CASCADE,
  repair_id UUID,
  checked BOOLEAN DEFAULT FALSE,
  comment TEXT,
  photo_url TEXT,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE reparaciones_exit_checks ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE reparaciones_exit_checks ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE reparaciones_exit_checks ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE reparaciones_exit_checks ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS reparaciones_exit_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES reparaciones_inspections(id) ON DELETE CASCADE,
  material_id UUID,
  name TEXT,
  quantity TEXT,
  reference TEXT,
  available BOOLEAN,
  checked BOOLEAN DEFAULT FALSE,
  is_extra BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reparaciones_exit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES reparaciones_inspections(id) ON DELETE CASCADE,
  photo_type TEXT DEFAULT 'general',
  photo_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reparaciones_repairs_inspection
  ON reparaciones_repairs(inspection_id);

CREATE INDEX IF NOT EXISTS idx_reparaciones_general_photos_inspection
  ON reparaciones_general_photos(inspection_id);

CREATE INDEX IF NOT EXISTS idx_reparaciones_repair_photos_inspection
  ON reparaciones_repair_photos(inspection_id);

CREATE INDEX IF NOT EXISTS idx_reparaciones_repair_photos_repair
  ON reparaciones_repair_photos(repair_id);

CREATE INDEX IF NOT EXISTS idx_reparaciones_materials_inspection
  ON reparaciones_materials(inspection_id);

CREATE INDEX IF NOT EXISTS idx_reparaciones_exit_checks_inspection
  ON reparaciones_exit_checks(inspection_id);

CREATE INDEX IF NOT EXISTS idx_reparaciones_exit_materials_inspection
  ON reparaciones_exit_materials(inspection_id);

CREATE INDEX IF NOT EXISTS idx_reparaciones_exit_photos_inspection
  ON reparaciones_exit_photos(inspection_id);

ALTER TABLE reparaciones_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparaciones_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparaciones_general_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparaciones_repair_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparaciones_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparaciones_exit_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparaciones_exit_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE reparaciones_exit_photos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reparaciones_inspections'
      AND policyname = 'reparaciones_inspections_all'
  ) THEN
    CREATE POLICY "reparaciones_inspections_all"
      ON reparaciones_inspections
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reparaciones_repairs'
      AND policyname = 'reparaciones_repairs_all'
  ) THEN
    CREATE POLICY "reparaciones_repairs_all"
      ON reparaciones_repairs
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reparaciones_general_photos'
      AND policyname = 'reparaciones_general_photos_all'
  ) THEN
    CREATE POLICY "reparaciones_general_photos_all"
      ON reparaciones_general_photos
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reparaciones_repair_photos'
      AND policyname = 'reparaciones_repair_photos_all'
  ) THEN
    CREATE POLICY "reparaciones_repair_photos_all"
      ON reparaciones_repair_photos
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reparaciones_materials'
      AND policyname = 'reparaciones_materials_all'
  ) THEN
    CREATE POLICY "reparaciones_materials_all"
      ON reparaciones_materials
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reparaciones_exit_checks'
      AND policyname = 'reparaciones_exit_checks_all'
  ) THEN
    CREATE POLICY "reparaciones_exit_checks_all"
      ON reparaciones_exit_checks
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reparaciones_exit_materials'
      AND policyname = 'reparaciones_exit_materials_all'
  ) THEN
    CREATE POLICY "reparaciones_exit_materials_all"
      ON reparaciones_exit_materials
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reparaciones_exit_photos'
      AND policyname = 'reparaciones_exit_photos_all'
  ) THEN
    CREATE POLICY "reparaciones_exit_photos_all"
      ON reparaciones_exit_photos
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
