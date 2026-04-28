-- ============================================================================
-- RPG Session — Bestiary System
-- Execute no SQL Editor do Supabase
-- ============================================================================

-- 1. CREATURES
CREATE TABLE creatures (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  level            INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 20),
  rarity           TEXT NOT NULL DEFAULT 'common'
                   CHECK (rarity IN ('common','uncommon','rare','epic','legendary')),
  is_public        BOOLEAN NOT NULL DEFAULT true,
  is_playable      BOOLEAN NOT NULL DEFAULT false,
  image            TEXT NOT NULL DEFAULT '',
  token_image      TEXT NOT NULL DEFAULT '',
  species          TEXT NOT NULL DEFAULT '',
  classification   TEXT NOT NULL DEFAULT 'beast'
                   CHECK (classification IN ('beast','humanoid','aberration','spirit','construct')),
  habitat          TEXT NOT NULL DEFAULT '',
  region           TEXT NOT NULL DEFAULT '',
  biome            TEXT NOT NULL DEFAULT 'forest'
                   CHECK (biome IN ('forest','tundra','swamp','underground','desert',
                                    'plains','mountains','coastal','urban','volcanic')),
  diet             TEXT NOT NULL DEFAULT 'omnivore'
                   CHECK (diet IN ('carnivore','herbivore','omnivore','arcane')),
  behavior         TEXT NOT NULL DEFAULT 'social'
                   CHECK (behavior IN ('aggressive','territorial','social','solitary','hunter','opportunistic')),
  intelligence_level TEXT NOT NULL DEFAULT 'medium'
                   CHECK (intelligence_level IN ('low','medium','high','sentient')),
  language         TEXT NOT NULL DEFAULT '',
  lifespan         TEXT NOT NULL DEFAULT '',
  reproduction     TEXT NOT NULL DEFAULT '',
  growth_stages    JSONB DEFAULT '[]'::jsonb,

  -- Combat
  hp               INT NOT NULL DEFAULT 0,
  mana             INT NOT NULL DEFAULT 0,
  armor            INT NOT NULL DEFAULT 0,
  speed            INT NOT NULL DEFAULT 0,
  initiative       INT NOT NULL DEFAULT 0,
  strength         INT NOT NULL DEFAULT 10,
  dexterity        INT NOT NULL DEFAULT 10,
  constitution     INT NOT NULL DEFAULT 10,
  intelligence     INT NOT NULL DEFAULT 10,
  wisdom           INT NOT NULL DEFAULT 10,

  -- String arrays
  skills           JSONB DEFAULT '[]'::jsonb,
  resistances      JSONB DEFAULT '[]'::jsonb,
  weaknesses       JSONB DEFAULT '[]'::jsonb,
  immunities       JSONB DEFAULT '[]'::jsonb,
  damage_types     JSONB DEFAULT '[]'::jsonb,
  loot_table       JSONB DEFAULT '[]'::jsonb,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_creatures_rarity ON creatures(rarity);
CREATE INDEX idx_creatures_level ON creatures(level);
CREATE INDEX idx_creatures_name ON creatures USING gin (name gin_trgm_ops);

-- 2. CREATURE_ABILITIES (junção criatura → abilities_catalog OU spells_catalog)
--    Executar migration corretiva primeiro:
--    DROP TABLE IF EXISTS creature_abilities;
CREATE TABLE creature_abilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creature_id   UUID NOT NULL REFERENCES creatures(id) ON DELETE CASCADE,
  ability_id    UUID REFERENCES abilities_catalog(id) ON DELETE CASCADE,
  spell_id      UUID REFERENCES spells_catalog(id) ON DELETE CASCADE,
  slot_type     TEXT NOT NULL DEFAULT 'active'
                CHECK (slot_type IN ('active','passive')),
  CHECK (ability_id IS NOT NULL OR spell_id IS NOT NULL),
  UNIQUE NULLS NOT DISTINCT (creature_id, ability_id, spell_id, slot_type),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ca_creature ON creature_abilities(creature_id);

-- 3. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE creatures, creature_abilities;
