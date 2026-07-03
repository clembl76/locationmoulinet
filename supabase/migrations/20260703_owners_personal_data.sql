-- Données personnelles du bailleur (pour génération du bail)
ALTER TABLE owners ADD COLUMN IF NOT EXISTS etat_civil TEXT;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS birth_place TEXT;
