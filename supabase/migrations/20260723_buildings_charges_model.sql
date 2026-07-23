-- ⚠️  À EXÉCUTER MANUELLEMENT dans l'éditeur SQL du dashboard Supabase.
-- Ce projet n'a ni connexion Postgres directe ni RPC générique capable d'exécuter
-- du DDL (le seul RPC dispo, run_sql, est en lecture seule).
--
-- Ajoute buildings.charges_model : catégorie de charges affichée sur la fiche
-- appartement publique (lib/apartmentContent.ts), distincte de
-- apartment_installation.charges_type qui sert au relevé de compteurs de l'EDL.
--
-- - forfait_total   : toutes les charges comprises (eau, électricité, chauffage, internet) — Moulinet
-- - forfait_partiel : forfait de charges hors électricité et internet — Vieux Palais, Bons Enfants
-- - reel            : charges au réel, pas de forfait — Renard

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS charges_model TEXT
  CHECK (charges_model IN ('forfait_total', 'forfait_partiel', 'reel'));

UPDATE public.buildings SET charges_model = 'forfait_total'   WHERE short_name = 'Moulinet';
UPDATE public.buildings SET charges_model = 'forfait_partiel' WHERE short_name = 'Vieux Palais';
UPDATE public.buildings SET charges_model = 'forfait_partiel' WHERE short_name = 'Bons Enfants';
UPDATE public.buildings SET charges_model = 'reel'            WHERE short_name = 'Renard';
