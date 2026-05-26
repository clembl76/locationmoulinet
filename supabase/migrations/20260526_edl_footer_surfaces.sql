-- Commentaire sortie sur les lignes de surfaces
ALTER TABLE surfaces
  ADD COLUMN IF NOT EXISTS notes_exit TEXT;

-- Commentaires / réserves sur caution (bloc footer EDL figé)
ALTER TABLE apartment_installation
  ADD COLUMN IF NOT EXISTS deposit_notes TEXT;
