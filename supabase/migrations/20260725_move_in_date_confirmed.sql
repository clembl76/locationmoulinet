-- ⚠️  À EXÉCUTER MANUELLEMENT dans l'éditeur SQL du dashboard Supabase.
-- Ce projet n'a ni connexion Postgres directe ni RPC générique capable d'exécuter
-- du DDL (le seul RPC dispo, run_sql, est en lecture seule).
--
-- leases.move_in_date_confirmed_at : marque qu'on a confirmé la vraie date
-- d'emménagement (au lieu de la valeur par défaut = signing_date). Permet de
-- "résoudre" l'action "date d'edl d'entrée à déterminer" sans changer les dates
-- réelles du bail.

ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS move_in_date_confirmed_at DATE;
