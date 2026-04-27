-- Correction sécurité : ré-activation RLS avec policies adaptées à l'architecture.
--
-- Rôles utilisés :
--   anon         → clé publique (NEXT_PUBLIC_SUPABASE_ANON_KEY), formulaires publics
--   service_role → clé serveur (SUPABASE_SERVICE_ROLE_KEY), Server Actions Next.js

-- ─── 1. Ré-activer RLS (déjà actif sur toutes les tables — étape idempotente) ──

ALTER TABLE apartments                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_apartments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_settings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_availability_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_guarantors          ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_applications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_tenants                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantors                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rents                         ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_keys                ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_installation        ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_elements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_linxo            ENABLE ROW LEVEL SECURITY;
ALTER TABLE linxo_mappings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE electricity_consumption       ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions                  ENABLE ROW LEVEL SECURITY;

-- ─── 2. Supprimer les anciennes policies obsolètes ────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can do everything" ON apartments;
DROP POLICY IF EXISTS "Public can read apartments"            ON apartments;
DROP POLICY IF EXISTS "Public can read buildings"             ON buildings;
DROP POLICY IF EXISTS "Authenticated users can do everything" ON leases;
DROP POLICY IF EXISTS "Public can read leases"                ON leases;
DROP POLICY IF EXISTS "Authenticated users can do everything" ON tenants;
DROP POLICY IF EXISTS "Authenticated users can do everything" ON guarantors;
DROP POLICY IF EXISTS "Authenticated users can do everything" ON lease_tenants;

-- ─── 3. Policies service_role (accès total — Server Actions Next.js) ──────────

CREATE POLICY "service_role full access" ON apartments
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON buildings
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON visitors
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON visitor_apartments
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON visit_settings
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON visit_availability_rules
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON visit_availability_exceptions
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON candidates
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON candidate_guarantors
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON candidate_applications
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON candidate_documents
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON tenants
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON leases
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON lease_tenants
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON guarantors
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON rents
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON apartment_keys
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON check_in_reports
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON check_in_elements
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON inventory_items
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON transactions_linxo
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON linxo_mappings
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON apartment_installation
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON electricity_consumption
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON owners
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role full access" ON transactions
  TO service_role USING (true) WITH CHECK (true);

-- ─── 4. Policies anon — lecture publique (site vitrine) ──────────────────────

CREATE POLICY "anon read" ON apartments
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon read" ON buildings
  FOR SELECT TO anon USING (true);

-- ─── 5. Policies anon — lecture pour les créneaux de visite ──────────────────

CREATE POLICY "anon read" ON visit_settings
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon read" ON visit_availability_rules
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon read" ON visit_availability_exceptions
  FOR SELECT TO anon USING (true);

-- ─── 6. Policies anon — écriture formulaires publics /visiter et /candidater ──

CREATE POLICY "anon insert" ON visitors
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon insert" ON visitor_apartments
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon insert" ON candidates
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon insert" ON candidate_guarantors
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon insert" ON candidate_applications
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon insert" ON candidate_documents
  FOR INSERT TO anon WITH CHECK (true);
