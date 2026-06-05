-- Commentaires ou réserves du locataire (bloc footer EDL figé)
ALTER TABLE apartment_installation
  ADD COLUMN IF NOT EXISTS tenant_notes_exit TEXT;
