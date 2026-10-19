-- ⚠️  À EXÉCUTER MANUELLEMENT dans l'éditeur SQL du dashboard Supabase.
-- Ce projet n'a ni connexion Postgres directe ni RPC générique capable d'exécuter
-- du DDL (le seul RPC dispo, run_sql, est en lecture seule).
--
-- short_term_revenues : revenus de location courte durée (Airbnb, Le Bon Coin…).
-- Pas de locataire ni de bail : une ligne par paiement et par appartement (un paiement
-- groupé sur plusieurs appartements est réparti en autant de lignes).
-- Ces revenus comptent dans le CA (getCaByMonth) et un appartement ayant un revenu de
-- courte durée sur un mois est considéré occupé ce mois-là (getOccupationRateByBuildingMonth).
--
-- import_key : identifiant de la ligne source, pour qu'un import relancé n'insère pas de doublon.

CREATE TABLE IF NOT EXISTS public.short_term_revenues (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id),
  year         SMALLINT NOT NULL,
  month        SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  platform     TEXT NOT NULL,
  amount       NUMERIC NOT NULL,
  description  TEXT,
  import_key   TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS short_term_revenues_period_idx
  ON public.short_term_revenues (year, month);

CREATE INDEX IF NOT EXISTS short_term_revenues_apartment_idx
  ON public.short_term_revenues (apartment_id);

ALTER TABLE public.short_term_revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access" ON public.short_term_revenues;
CREATE POLICY "service_role full access" ON public.short_term_revenues
  TO service_role USING (true) WITH CHECK (true);
