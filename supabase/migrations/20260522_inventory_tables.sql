-- Tables inventaire : catalogue d'items et inventaire par appartement

-- ─── Enums ───────────────────────────────────────────────────────────────────
-- room_type et item_condition : enums existants dans Supabase, réutilisés tels quels.

-- ─── Catalogue d'items ───────────────────────────────────────────────────────

CREATE TABLE items (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text        NOT NULL,
  default_room  room_type   NOT NULL,
  name          text        NOT NULL,
  reference_url text,
  unit_price    numeric(10,2),
  labor_cost    numeric(10,2),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role full access" ON items TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon read" ON items FOR SELECT TO anon USING (true);

-- ─── Inventaire par appartement ──────────────────────────────────────────────

CREATE TABLE inventory (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid           NOT NULL REFERENCES apartments(id),
  item_id      uuid           NOT NULL REFERENCES items(id),
  room         room_type      NOT NULL,
  quantity     int            NOT NULL DEFAULT 1,
  condition    item_condition,
  created_at   timestamptz    DEFAULT now(),
  updated_at   timestamptz    DEFAULT now()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role full access" ON inventory TO service_role USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();
