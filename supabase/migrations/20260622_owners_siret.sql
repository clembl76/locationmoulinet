-- N° SIRET du bailleur, requis pour l'attestation de loyer CAF/MSA (CERFA 10842*07)
ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS siret TEXT;
