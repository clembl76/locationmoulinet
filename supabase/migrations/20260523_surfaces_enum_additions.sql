-- Ajout de valeurs aux enums surface_type et surface_material

ALTER TYPE surface_type ADD VALUE IF NOT EXISTS 'Prises électriques';
ALTER TYPE surface_type ADD VALUE IF NOT EXISTS 'Interrupteurs';
ALTER TYPE surface_type ADD VALUE IF NOT EXISTS 'Point lumière';
ALTER TYPE surface_type ADD VALUE IF NOT EXISTS 'Ventilation';

ALTER TYPE surface_material ADD VALUE IF NOT EXISTS 'PVC';
