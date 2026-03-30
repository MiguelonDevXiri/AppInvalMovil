-- Añadir campo comment a exit_checks para comentarios de comprobación
ALTER TABLE exit_checks ADD COLUMN IF NOT EXISTS comment TEXT;
