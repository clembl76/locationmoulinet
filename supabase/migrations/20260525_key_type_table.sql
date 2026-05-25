CREATE TABLE IF NOT EXISTS key_type (
  id   SERIAL PRIMARY KEY,
  label TEXT NOT NULL UNIQUE
);

INSERT INTO key_type (label) VALUES
  ('Vigik Immeuble'),
  ('Porte palière appartement'),
  ('Boite aux lettres'),
  ('Cave')
ON CONFLICT (label) DO NOTHING;
