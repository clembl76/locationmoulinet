-- Déplace insurance_attestation de tenants vers leases
-- (si la colonne avait été ajoutée à tenants, elle est retirée)
ALTER TABLE leases ADD COLUMN IF NOT EXISTS insurance_attestation BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants DROP COLUMN IF EXISTS insurance_attestation;
