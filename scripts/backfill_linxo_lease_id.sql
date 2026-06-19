-- Backfill du lease_id sur les transactions_linxo existantes
-- À exécuter dans l'éditeur SQL Supabase après la migration 20260619_linxo_lease_id.sql
--
-- Logique : pour chaque transaction avec un apartment_num renseigné,
-- retrouver le bail actif à la date de la transaction (signing_date <= date <= move_out_inspection_date).
-- En cas de chevauchement, prend le bail le plus récemment signé.

UPDATE transactions_linxo tl
SET lease_id = (
  SELECT l.id
  FROM leases l
  JOIN apartments a ON a.id = l.apartment_id
  WHERE a.number::text = tl.apartment_num::text
    AND tl.date >= l.signing_date
    AND (l.move_out_inspection_date IS NULL OR tl.date <= l.move_out_inspection_date)
  ORDER BY l.signing_date DESC
  LIMIT 1
)
WHERE tl.apartment_num IS NOT NULL
  AND tl.lease_id IS NULL;

-- Vérification (à exécuter séparément)
-- SELECT apartment_num, lease_id, COUNT(*) AS nb
-- FROM transactions_linxo
-- WHERE apartment_num IS NOT NULL
-- GROUP BY apartment_num, lease_id
-- ORDER BY apartment_num, lease_id;
