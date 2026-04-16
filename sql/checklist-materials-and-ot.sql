-- =====================================================
-- Inspecciones: materiales opcionales + OT global
-- =====================================================

ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS ot_number TEXT;

ALTER TABLE averias_inspections
  ADD COLUMN IF NOT EXISTS ot_number TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE acteco_inspections
  ADD COLUMN IF NOT EXISTS ot_number TEXT;

CREATE TABLE IF NOT EXISTS checklist_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  name TEXT,
  quantity TEXT,
  reference TEXT,
  available BOOLEAN,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_materials_machine ON checklist_materials(machine_id);

ALTER TABLE checklist_materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'checklist_materials'
      AND policyname = 'checklist_materials_all'
  ) THEN
    CREATE POLICY "checklist_materials_all"
      ON checklist_materials
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
