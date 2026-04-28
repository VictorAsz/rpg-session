-- ============================================================================
-- RPG Session — Migration: catálogos separados + equipments refatorado
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- 1. DROPAR tabelas antigas (na ordem correta por causa das FKs)
DROP TABLE IF EXISTS equipped_items;
DROP TABLE IF EXISTS character_items;
DROP TABLE IF EXISTS character_spells;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS spells;
DROP TABLE IF EXISTS abilities;
DROP TABLE IF EXISTS spells_catalog;
DROP TABLE IF EXISTS items_catalog;

-- 2. SPELLS_CATALOG (compêndio de magias)
--    type_cast = tipo de conjuração (ritual, truque, etc.)
CREATE TABLE spells_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  image_url     TEXT NOT NULL DEFAULT '',
  mana_cost     INT NOT NULL DEFAULT 0,
  type_cast     TEXT NOT NULL DEFAULT 'conjuracao'
                CHECK (type_cast IN ('ritual','truque','conjuracao','invocacao','encantamento')),
  school        TEXT NOT NULL DEFAULT 'Evocacao'
                CHECK (school IN ('Evocacao','Convocacao','Encantamento','Transmutacao','Ilusao','Divinacao','Abjuracao')),
  element       TEXT NOT NULL DEFAULT '',
  requirement   TEXT NOT NULL DEFAULT '',
  target_type   TEXT NOT NULL DEFAULT 'single'
                CHECK (target_type IN ('single','self','area','all')),
  level         INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  effect        JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ABILITIES_CATALOG (compêndio de habilidades)
CREATE TABLE abilities_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  image_url     TEXT NOT NULL DEFAULT '',
  cost_type     TEXT NOT NULL DEFAULT 'none'
                CHECK (cost_type IN ('mana','hp','none')),
  cost_amount   INT NOT NULL DEFAULT 0,
  ability_type  TEXT NOT NULL DEFAULT 'ativa'
                CHECK (ability_type IN ('passiva','ativa','reacao')),
  school        TEXT NOT NULL DEFAULT 'Evocacao'
                CHECK (school IN ('Evocacao','Convocacao','Encantamento','Transmutacao','Ilusao','Divinacao','Abjuracao')),
  element       TEXT NOT NULL DEFAULT '',
  requirement   TEXT NOT NULL DEFAULT '',
  target_type   TEXT NOT NULL DEFAULT 'self'
                CHECK (target_type IN ('single','self','area','all')),
  level         INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  effect        JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ITEMS_CATALOG (compêndio de itens)
CREATE TABLE items_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  image_url     TEXT NOT NULL DEFAULT '',
  value         INT NOT NULL DEFAULT 0,
  is_usable     BOOLEAN NOT NULL DEFAULT false,
  is_equippable BOOLEAN NOT NULL DEFAULT false,
  effect        JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CHARACTER_SPELLS (personagem conhece magia do catálogo)
CREATE TABLE character_spells (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  catalog_id    UUID NOT NULL REFERENCES spells_catalog(id) ON DELETE CASCADE,
  UNIQUE (character_id, catalog_id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_char ON character_spells(character_id);
CREATE INDEX idx_cs_catalog ON character_spells(catalog_id);

-- 6. CHARACTER_ABILITIES (personagem possui habilidade do catálogo)
CREATE TABLE character_abilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  catalog_id    UUID NOT NULL REFERENCES abilities_catalog(id) ON DELETE CASCADE,
  UNIQUE (character_id, catalog_id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ca_char ON character_abilities(character_id);
CREATE INDEX idx_ca_catalog ON character_abilities(catalog_id);

-- 7. CHARACTER_ITEMS (personagem possui item do catálogo + quantidade)
CREATE TABLE character_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  catalog_id    UUID NOT NULL REFERENCES items_catalog(id) ON DELETE CASCADE,
  quantity      INT NOT NULL DEFAULT 1,
  equipped      BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (character_id, catalog_id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ci_char ON character_items(character_id);
CREATE INDEX idx_ci_catalog ON character_items(catalog_id);

-- 8. EQUIPPED_ITEMS (slots — agora referencia character_items ao invés de items)
CREATE TABLE equipped_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id       UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  character_item_id  UUID REFERENCES character_items(id) ON DELETE SET NULL,
  slot               TEXT NOT NULL CHECK (slot IN (
                       'left_hand','right_hand','head','body',
                       'legs','boots','gloves','accessory_1','accessory_2'
                     )),
  UNIQUE (character_id, slot),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_equipped_char ON equipped_items(character_id);

-- ============================================================================
-- REALTIME — adiciona todas as tabelas novas
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE
  spells_catalog,
  abilities_catalog,
  items_catalog,
  character_spells,
  character_abilities,
  character_items,
  equipped_items;
