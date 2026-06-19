-- Initialisation des statuts de baux
-- À exécuter dans l'éditeur SQL Supabase (une seule fois)
--
-- Résultat attendu :
--   - Tous les baux passés (move_out_inspection_date < aujourd'hui) → status = 'archived'
--   - Exception : bail 1000/MINOT et bail 11/HAMMOUM → status = 'active' (ils apparaîtront en "closing")

-- Étape 1 : migration des colonnes (idempotente)
ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS edl_signed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deposit_returned BOOLEAN NOT NULL DEFAULT FALSE;

-- Étape 2 : archiver tous les baux passés sauf MINOT et HAMMOUM
UPDATE leases
SET status = 'archived'
WHERE move_out_inspection_date < CURRENT_DATE
  AND id NOT IN (
    SELECT l.id
    FROM leases l
    JOIN apartments a ON a.id = l.apartment_id
    JOIN lease_tenants lt ON lt.lease_id = l.id
    JOIN tenants t ON t.id = lt.tenant_id
    WHERE l.move_out_inspection_date < CURRENT_DATE
      AND (
        (a.number = '1000' AND t.last_name ILIKE '%MINOT%')
        OR (a.number = '11'   AND t.last_name ILIKE '%HAMMOUM%')
      )
  );

-- Vérification (optionnelle, à exécuter séparément après l'UPDATE)
-- SELECT a.number, t.last_name, l.move_out_inspection_date, l.status
-- FROM leases l
-- JOIN apartments a ON a.id = l.apartment_id
-- LEFT JOIN lease_tenants lt ON lt.lease_id = l.id
-- LEFT JOIN tenants t ON t.id = lt.tenant_id
-- WHERE l.move_out_inspection_date < CURRENT_DATE
-- ORDER BY l.move_out_inspection_date DESC;
