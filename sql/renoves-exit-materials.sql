CREATE TABLE IF NOT EXISTS exit_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
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

ALTER TABLE IF EXISTS exit_materials ADD COLUMN IF NOT EXISTS material_id UUID;
ALTER TABLE IF EXISTS exit_materials ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE IF EXISTS exit_materials ADD COLUMN IF NOT EXISTS quantity TEXT;
ALTER TABLE IF EXISTS exit_materials ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE IF EXISTS exit_materials ADD COLUMN IF NOT EXISTS available BOOLEAN;
ALTER TABLE IF EXISTS exit_materials ADD COLUMN IF NOT EXISTS checked BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS exit_materials ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS exit_materials ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE IF EXISTS exit_materials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_exit_materials_machine ON exit_materials(machine_id);

ALTER TABLE exit_materials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exit_materials'
      AND policyname = 'exit_materials_all'
  ) THEN
    CREATE POLICY "exit_materials_all"
      ON exit_materials
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;