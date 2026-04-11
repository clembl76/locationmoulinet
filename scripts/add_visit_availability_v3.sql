-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Contact gestion locative dans visit_settings
ALTER TABLE visit_settings
  ADD COLUMN IF NOT EXISTS contact_name    TEXT DEFAULT 'Mme Clémentine ALAOUI',
  ADD COLUMN IF NOT EXISTS contact_phone   TEXT DEFAULT '06 28 07 67 29',
  ADD COLUMN IF NOT EXISTS contact_email   TEXT DEFAULT 'location.moulinet@gmail.com',
  ADD COLUMN IF NOT EXISTS contact_website TEXT DEFAULT 'http://localhost:3000/';

-- Mettre les valeurs par défaut sur la ligne existante si vides
UPDATE visit_settings
SET
  contact_name    = COALESCE(contact_name,    'Mme Clémentine ALAOUI'),
  contact_phone   = COALESCE(contact_phone,   '06 28 07 67 29'),
  contact_email   = COALESCE(contact_email,   'location.moulinet@gmail.com'),
  contact_website = COALESCE(contact_website, 'http://localhost:3000/');

-- Ramener la durée par défaut à 30 min
UPDATE visit_settings SET slot_duration_minutes = 30 WHERE slot_duration_minutes NOT IN (15, 30, 45);

-- 2. Plages horaires sur les exceptions (null = journée entière)
ALTER TABLE visit_availability_exceptions
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time   TIME;
