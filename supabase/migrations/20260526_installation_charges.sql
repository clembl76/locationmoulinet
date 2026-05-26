-- Ajout des colonnes charges_type et meter_readings à apartment_installation
ALTER TABLE apartment_installation
  ADD COLUMN IF NOT EXISTS charges_type TEXT DEFAULT 'forfait',
  ADD COLUMN IF NOT EXISTS meter_readings TEXT;
