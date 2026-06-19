-- Ajout de la colonne lease_id sur transactions_linxo
-- Permet de lier chaque transaction directement à un bail plutôt qu'à un locataire
ALTER TABLE transactions_linxo
  ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES leases(id);
