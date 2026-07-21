-- Rollback : recréation des tables de l'ancien écran "État des lieux" (rapport unique)
-- Généré le 2026-07-21 par introspection du schéma Supabase réel, AVANT suppression
-- (check_in_reports, check_in_elements, inventory_items — page /admin/apartments/[number]/edl/[reportId]).
--
-- À utiliser uniquement si la suppression du 2026-07-21 doit être annulée :
--   1. Exécuter ce fichier (Supabase SQL editor, ou via scripts/rollback_legacy_edl_restore.mjs)
--   2. Réinjecter les données avec scripts/rollback_legacy_edl_restore.mjs (lit rollback_legacy_edl_data.json)
--   3. Restaurer le code applicatif supprimé via `git revert` sur le commit de suppression
--
-- IMPORTANT : ne recrée PAS les types enum `room_type` / `item_condition`. Ils sont partagés
-- avec les tables actives inventory/surfaces/items (système "EDL figé") et existent déjà —
-- ne jamais les DROP ni les recréer indépendamment de ce rollback.
--
-- Ce script suppose que les 3 tables ont été entièrement supprimées (DROP TABLE) au préalable ;
-- il n'est pas idempotent sur les contraintes/policies (CREATE POLICY ne supporte pas IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS public.check_in_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lease_id uuid NOT NULL,
  entry_date date,
  exit_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT check_in_reports_pkey PRIMARY KEY (id),
  CONSTRAINT check_in_reports_lease_id_key UNIQUE (lease_id),
  CONSTRAINT check_in_reports_lease_id_fkey FOREIGN KEY (lease_id)
    REFERENCES public.leases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.check_in_elements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL,
  room room_type NOT NULL,
  element text NOT NULL,
  condition_entry item_condition,
  comment_entry text,
  condition_exit item_condition,
  comment_exit text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT edl_elements_pkey PRIMARY KEY (id),
  CONSTRAINT edl_elements_apartment_id_fkey FOREIGN KEY (apartment_id)
    REFERENCES public.apartments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS check_in_elements_apt_idx ON public.check_in_elements USING btree (apartment_id);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL,
  room room_type NOT NULL,
  item text NOT NULL,
  quantity_entry integer,
  condition_entry item_condition,
  comment_entry text,
  quantity_exit integer,
  condition_exit item_condition,
  comment_exit text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT inventaire_articles_pkey PRIMARY KEY (id),
  CONSTRAINT inventaire_articles_apartment_id_fkey FOREIGN KEY (apartment_id)
    REFERENCES public.apartments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS inventory_items_apt_idx ON public.inventory_items USING btree (apartment_id);

ALTER TABLE public.check_in_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access" ON public.check_in_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role full access" ON public.check_in_elements
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role full access" ON public.inventory_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
