-- Convertir surface et material en text pour ne plus dépendre des enums PostgreSQL.
-- Les listes de valeurs sont gérées côté TypeScript (surfacesConstants.ts).
-- Les anciennes migrations d'enum (surfaces_enum_additions, surfaces_material_bois)
-- ne sont plus nécessaires mais peuvent rester sans effet.

ALTER TABLE surfaces
  ALTER COLUMN surface  TYPE text USING surface::text,
  ALTER COLUMN material TYPE text USING material::text;
