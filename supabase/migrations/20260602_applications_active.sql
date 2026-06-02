ALTER TABLE visit_settings
  ADD COLUMN IF NOT EXISTS applications_active BOOLEAN NOT NULL DEFAULT true;
