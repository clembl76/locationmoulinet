-- Ajout de la valeur Bois à l'enum surface_material

ALTER TYPE surface_material ADD VALUE IF NOT EXISTS 'Bois';
