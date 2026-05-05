-- =====================================================
-- Seguridad previa para inspecciones, urgencias, averías e instalaciones
-- =====================================================

ALTER TABLE machines
  ADD COLUMN IF NOT EXISTS safety_checklist JSONB;

ALTER TABLE acteco_inspections
  ADD COLUMN IF NOT EXISTS safety_checklist JSONB;

ALTER TABLE averias_inspections
  ADD COLUMN IF NOT EXISTS safety_checklist JSONB;

ALTER TABLE instalaciones_inspections
  ADD COLUMN IF NOT EXISTS safety_checklist JSONB;
