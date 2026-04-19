-- Toutes les tables de ce projet sont accédées exclusivement via des Server Actions
-- Next.js (jamais directement depuis le navigateur). La sécurité est assurée par
-- le code serveur, pas par RLS. On désactive RLS globalement pour éviter les
-- blocages liés au nouveau format de clé Supabase (sb_publishable_*).

-- Tables déjà traitées (migration 20260416) :
-- transactions_linxo, linxo_mappings

ALTER TABLE visitors                    DISABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_apartments          DISABLE ROW LEVEL SECURITY;
ALTER TABLE visit_settings              DISABLE ROW LEVEL SECURITY;
ALTER TABLE visit_availability_rules    DISABLE ROW LEVEL SECURITY;
ALTER TABLE visit_availability_exceptions DISABLE ROW LEVEL SECURITY;

ALTER TABLE candidates                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_guarantors        DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_applications      DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents         DISABLE ROW LEVEL SECURITY;

ALTER TABLE tenants                     DISABLE ROW LEVEL SECURITY;
ALTER TABLE leases                      DISABLE ROW LEVEL SECURITY;
ALTER TABLE lease_tenants               DISABLE ROW LEVEL SECURITY;
ALTER TABLE guarantors                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE rents                       DISABLE ROW LEVEL SECURITY;

ALTER TABLE apartments                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_keys              DISABLE ROW LEVEL SECURITY;

ALTER TABLE check_in_reports            DISABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_elements           DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items             DISABLE ROW LEVEL SECURITY;
