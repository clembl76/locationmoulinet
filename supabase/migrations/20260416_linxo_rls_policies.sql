-- transactions_linxo est une table purement serveur (import admin).
-- On désactive RLS pour éviter les blocages liés au nouveau format de clé Supabase (sb_publishable_*).
ALTER TABLE transactions_linxo DISABLE ROW LEVEL SECURITY;

-- linxo_mappings également (même usage serveur)
ALTER TABLE linxo_mappings DISABLE ROW LEVEL SECURITY;
