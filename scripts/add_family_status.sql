-- À exécuter dans l'éditeur SQL de Supabase
-- Ajoute la colonne family_status sur la table candidates

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS family_status TEXT;
