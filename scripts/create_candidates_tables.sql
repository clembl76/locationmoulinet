-- À exécuter dans l'éditeur SQL de Supabase

CREATE TABLE IF NOT EXISTS candidates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  birth_date  DATE,
  birth_place TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_guarantors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  title        TEXT,
  first_name   TEXT,
  last_name    TEXT,
  email        TEXT,
  phone        TEXT,
  birth_date   DATE,
  birth_place  TEXT,
  address      TEXT
);

CREATE TABLE IF NOT EXISTS candidate_applications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id         UUID REFERENCES candidates(id) ON DELETE CASCADE,
  apartment_id         UUID REFERENCES apartments(id),
  desired_signing_date DATE,
  status               TEXT DEFAULT 'pending',
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES candidate_applications(id) ON DELETE CASCADE,
  owner          TEXT NOT NULL,
  file_name      TEXT,
  drive_url      TEXT,
  uploaded_at    TIMESTAMPTZ DEFAULT now()
);
