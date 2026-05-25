-- Section État des lieux : surfaces et équipements

-- ─── Énumération des types de surface/équipement ─────────────────────────────

CREATE TYPE surface_type AS ENUM (
  'Mur',
  'Sol',
  'Plafond',
  'Porte (y compris cadre, poignée)',
  'Fenêtre (vitre, cadre, poignée)',
  'Crédence',
  'Robinetterie',
  'Trappe de visite',
  'Tableau électrique',
  'WC (y compris chasse d''eau, joints et abattant)',
  'Lavabo (y compris robinetterie et joints)',
  'Évier',
  'Rembarde',
  'Escalier',
  'Rampe'
);

-- ─── Énumération des matières ─────────────────────────────────────────────────

CREATE TYPE surface_material AS ENUM (
  'Peinture',
  'Parquet',
  'Parquet peint',
  'Carrelage/faïence',
  'Vinyle',
  'Inox',
  'Verre',
  'Plastique',
  'Lambris',
  'Contreplaqué'
);

-- ─── Table surfaces (lien appartement ↔ surfaces/équipements) ─────────────────

CREATE TABLE surfaces (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid           NOT NULL REFERENCES apartments(id),
  surface      surface_type   NOT NULL,
  material     surface_material,
  condition    item_condition,
  notes        text,
  created_at   timestamptz    DEFAULT now(),
  updated_at   timestamptz    DEFAULT now()
);

ALTER TABLE surfaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role full access" ON surfaces TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER surfaces_updated_at
  BEFORE UPDATE ON surfaces
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();
