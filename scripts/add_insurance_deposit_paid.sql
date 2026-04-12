-- Attestation d'assurance habitation du locataire
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS insurance_attestation BOOLEAN NOT NULL DEFAULT FALSE;

-- Caution (dépôt de garantie) payée
ALTER TABLE leases ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN NOT NULL DEFAULT FALSE;
