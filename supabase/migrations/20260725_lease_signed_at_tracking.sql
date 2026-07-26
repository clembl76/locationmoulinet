-- ⚠️  À EXÉCUTER MANUELLEMENT dans l'éditeur SQL du dashboard Supabase.
-- Ce projet n'a ni connexion Postgres directe ni RPC générique capable d'exécuter
-- du DDL (le seul RPC dispo, run_sql, est en lecture seule).
--
-- Pour le tableau de bord des actions (/admin/actions) : la date de création des
-- actions "attestation d'assurance non reçue", "caution non reçue" et "edl à
-- envoyer" doit être la date à laquelle la candidature est passée au statut
-- 'signed', et non plus leases.signing_date.
--
-- - leases.candidate_application_id : lien vers la candidature à l'origine du bail
--   (absent jusqu'ici — aucune colonne ne reliait un bail à sa candidature)
-- - candidate_applications.signed_at : date de passage au statut 'signed'

ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS candidate_application_id UUID REFERENCES public.candidate_applications(id);

ALTER TABLE public.candidate_applications
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
