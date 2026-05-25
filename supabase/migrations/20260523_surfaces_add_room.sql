-- Ajouter le lien entre une surface/équipement et une pièce (room_type)

ALTER TABLE surfaces ADD COLUMN IF NOT EXISTS room room_type;
