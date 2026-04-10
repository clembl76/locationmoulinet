-- Ajoute le lien visitor_id dans candidate_applications
-- À exécuter dans l'éditeur SQL de Supabase

ALTER TABLE candidate_applications
  ADD COLUMN IF NOT EXISTS visitor_id UUID REFERENCES visitors(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
