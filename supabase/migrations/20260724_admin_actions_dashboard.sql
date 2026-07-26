-- ⚠️  À EXÉCUTER MANUELLEMENT dans l'éditeur SQL du dashboard Supabase.
-- Ce projet n'a ni connexion Postgres directe ni RPC générique capable d'exécuter
-- du DDL (le seul RPC dispo, run_sql, est en lecture seule).
--
-- Nouvelles colonnes pour le tableau de bord des actions (/admin/actions) :
-- - leases.edl_sent_at            : date d'envoi de l'état des lieux au locataire (action "EDL à envoyer")
-- - leases.notice_given_at        : date d'enregistrement du préavis de départ (action "Annonce à publier")
-- - leases.listing_published_at   : date de publication de l'annonce de relocation
-- - candidate_applications.accepted_at : date de passage du statut à 'accepted' (action "Bail en attente de signature")

ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS edl_sent_at DATE,
  ADD COLUMN IF NOT EXISTS notice_given_at DATE,
  ADD COLUMN IF NOT EXISTS listing_published_at DATE;

ALTER TABLE public.candidate_applications
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
