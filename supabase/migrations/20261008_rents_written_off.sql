-- ⚠️  À EXÉCUTER MANUELLEMENT dans l'éditeur SQL du dashboard Supabase.
-- Ce projet n'a ni connexion Postgres directe ni RPC générique capable d'exécuter
-- du DDL (le seul RPC dispo, run_sql, est en lecture seule).
--
-- rents.written_off_at : date à laquelle un loyer impayé a été déclaré irrécouvrable
-- (on ne recevra jamais l'argent). Le loyer reste impayé (amount_received NULL) mais
-- ne génère plus d'action "loyer à payer" sur le tableau de bord.

ALTER TABLE public.rents
  ADD COLUMN IF NOT EXISTS written_off_at DATE;
