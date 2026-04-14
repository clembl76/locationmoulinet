-- Nettoyage des données de test
-- À exécuter dans Supabase SQL Editor

TRUNCATE TABLE
  rents,
  lease_tenants,
  guarantors,
  check_in_reports,
  apartment_keys,
  check_in_elements,
  inventory_items,
  leases,
  tenants,
  candidate_documents,
  candidate_applications,
  candidate_guarantors,
  candidates,
  visitor_apartments,
  visitors
RESTART IDENTITY;
