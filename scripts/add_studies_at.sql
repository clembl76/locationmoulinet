-- À exécuter dans l'éditeur SQL de Supabase
-- Ajoute la colonne studies_at sur la table visitors

ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS studies_at TEXT;
