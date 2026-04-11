-- À exécuter dans l'éditeur SQL de Supabase
-- Tables pour la gestion des disponibilités de visite

-- Paramètres globaux (une seule ligne)
CREATE TABLE IF NOT EXISTS visit_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  active                BOOLEAN NOT NULL DEFAULT true,
  slot_duration_minutes INT NOT NULL DEFAULT 60,
  updated_at            TIMESTAMPTZ DEFAULT now()
);
INSERT INTO visit_settings (active, slot_duration_minutes)
SELECT true, 60
WHERE NOT EXISTS (SELECT 1 FROM visit_settings);

-- Plages de disponibilité hebdomadaires récurrentes
-- day_of_week : 0=Lundi, 1=Mardi, …, 6=Dimanche
CREATE TABLE IF NOT EXISTS visit_availability_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  CONSTRAINT valid_range CHECK (end_time > start_time)
);

-- Dates d'exception (journées entièrement bloquées)
CREATE TABLE IF NOT EXISTS visit_availability_exceptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE NOT NULL UNIQUE,
  label      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
