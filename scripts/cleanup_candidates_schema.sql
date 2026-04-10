-- Migration de nettoyage du schéma candidates
-- À exécuter dans l'éditeur SQL de Supabase
-- Ces colonnes appartiennent à candidate_applications, pas à candidates

-- 1. Supprimer les colonnes orphelines de la table candidates (si elles existent)
DO $$
BEGIN
  -- apartment_id (appartient à candidate_applications)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'apartment_id'
  ) THEN
    ALTER TABLE candidates DROP COLUMN apartment_id;
  END IF;

  -- desired_signing_date (appartient à candidate_applications)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'desired_signing_date'
  ) THEN
    ALTER TABLE candidates DROP COLUMN desired_signing_date;
  END IF;

  -- visitor_id (n'a pas de sens dans candidates)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'visitor_id'
  ) THEN
    ALTER TABLE candidates DROP COLUMN visitor_id;
  END IF;

  -- Colonnes garant dupliquées dans candidates (si elles existent — appartiennent à candidate_guarantors)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'g_first_name'
  ) THEN
    ALTER TABLE candidates DROP COLUMN g_first_name;
    ALTER TABLE candidates DROP COLUMN g_last_name;
    ALTER TABLE candidates DROP COLUMN g_email;
    ALTER TABLE candidates DROP COLUMN g_phone;
    ALTER TABLE candidates DROP COLUMN g_birth_date;
    ALTER TABLE candidates DROP COLUMN g_birth_place;
    ALTER TABLE candidates DROP COLUMN g_address;
    ALTER TABLE candidates DROP COLUMN g_title;
  END IF;
END $$;

-- 2. Vérifier l'état final de la table candidates
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'candidates'
ORDER BY ordinal_position;

-- 3. Vérifier l'état de candidate_applications
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'candidate_applications'
ORDER BY ordinal_position;

-- 4. Recharger le cache PostgREST
NOTIFY pgrst, 'reload schema';
