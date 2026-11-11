-- ⚠️  À EXÉCUTER MANUELLEMENT dans l'éditeur SQL du dashboard Supabase.
-- Ce projet n'a ni connexion Postgres directe ni RPC générique capable d'exécuter
-- du DDL (le seul RPC dispo, run_sql, est en lecture seule).
--
-- apartments.temporarily_unavailable : l'appartement reste affiché sur le site vitrine
-- mais apparaît « Indisponible » et ne peut plus recevoir de visites ni de candidatures.
-- Réglable depuis la fiche appartement admin.

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS temporarily_unavailable BOOLEAN NOT NULL DEFAULT FALSE;
