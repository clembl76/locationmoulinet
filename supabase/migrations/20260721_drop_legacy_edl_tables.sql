-- ⚠️  À EXÉCUTER MANUELLEMENT dans l'éditeur SQL du dashboard Supabase.
-- Ce projet n'a ni connexion Postgres directe (pas de DATABASE_URL en .env.local)
-- ni RPC générique capable d'exécuter du DDL (le seul RPC dispo, run_sql, est en
-- lecture seule — voir public.run_sql). Ce fichier n'a donc PAS pu être appliqué
-- automatiquement à la base — il documente l'intention et doit être collé/exécuté
-- à la main avant de considérer la suppression comme faite.
--
-- Suppression de l'ancien écran "État des lieux" (rapport unique), remplacé par le
-- système "EDL figé" (tables inventory/surfaces/items, actives et peuplées).
--
-- Avant suppression : 3 lignes dans check_in_reports (rattachées à des baux réels),
-- 0 ligne dans check_in_elements, 0 ligne dans inventory_items — le contenu détaillé
-- de ces rapports n'avait jamais été rempli.
--
-- Rollback disponible : scripts/rollback_legacy_edl_schema.sql (schéma) +
-- scripts/rollback_legacy_edl_data.json (snapshot des données) +
-- scripts/rollback_legacy_edl_restore.mjs (script de restauration automatique).
--
-- Aucune autre table ne référence ces 3 tables par clé étrangère (vérifié le 2026-07-21).
-- Les types enum room_type / item_condition ne sont PAS supprimés : ils sont partagés
-- avec les tables actives inventory/surfaces/items.

DROP TABLE IF EXISTS public.check_in_elements;
DROP TABLE IF EXISTS public.inventory_items;
DROP TABLE IF EXISTS public.check_in_reports;
