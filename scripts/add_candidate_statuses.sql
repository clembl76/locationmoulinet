-- Ajouter les valeurs de statut manquantes pour candidate_applications
-- À exécuter dans l'éditeur SQL de Supabase

-- Si le statut est un TEXT libre (pas un enum), rien à faire côté SQL.
-- Si c'est un enum PostgreSQL, ajouter les valeurs :

DO $$
BEGIN
  -- Vérifier si le type est un enum
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'application_status'
  ) THEN
    -- Ajouter 'withdrawn' si absent
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'application_status' AND e.enumlabel = 'withdrawn'
    ) THEN
      ALTER TYPE application_status ADD VALUE 'withdrawn';
    END IF;

    -- Ajouter 'signed' si absent
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'application_status' AND e.enumlabel = 'signed'
    ) THEN
      ALTER TYPE application_status ADD VALUE 'signed';
    END IF;
  END IF;
END $$;

-- Vérifier le type réel de la colonne status
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'candidate_applications' AND column_name = 'status';

NOTIFY pgrst, 'reload schema';
