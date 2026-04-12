ALTER TABLE leases ADD COLUMN IF NOT EXISTS docusign_lease_url TEXT;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS docusign_edl_url TEXT;
