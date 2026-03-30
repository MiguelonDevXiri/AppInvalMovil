-- ============================================================
-- Inspección de Salida - Tablas nuevas
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla exit_checks: ítems del checklist comprobados en la salida
CREATE TABLE IF NOT EXISTS exit_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ DEFAULT now(),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla exit_photos: fotos de salida (posiciones D1, D2, D3, D4)
CREATE TABLE IF NOT EXISTS exit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  position TEXT NOT NULL CHECK (position IN ('d1', 'd2', 'd3', 'd4')),
  photo_url TEXT NOT NULL,
  taken_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Añadir campo inspection_status a la tabla machines
ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS inspection_status TEXT DEFAULT 'entrada';

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_exit_checks_machine_id ON exit_checks(machine_id);
CREATE INDEX IF NOT EXISTS idx_exit_photos_machine_id ON exit_photos(machine_id);
CREATE INDEX IF NOT EXISTS idx_machines_inspection_status ON machines(inspection_status);

-- Habilitar RLS (Row Level Security)
ALTER TABLE exit_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_photos ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (igual que las otras tablas)
CREATE POLICY "exit_checks_all" ON exit_checks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "exit_photos_all" ON exit_photos FOR ALL USING (true) WITH CHECK (true);
