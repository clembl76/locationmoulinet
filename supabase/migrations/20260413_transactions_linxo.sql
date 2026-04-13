CREATE TABLE IF NOT EXISTS transactions_linxo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date                DATE,
  libelle             TEXT,
  categorie           TEXT,
  montant             NUMERIC(12, 2),
  notes               TEXT,
  numero_cheque       TEXT,
  labels              TEXT,
  nom_du_compte       TEXT,
  nom_de_la_connexion TEXT,
  source              TEXT NOT NULL,
  fingerprint         TEXT UNIQUE NOT NULL,
  imported_at         TIMESTAMPTZ DEFAULT NOW()
);
