-- notes_exit sur les lignes d'inventaire pour le commentaire de sortie
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS notes_exit TEXT;
