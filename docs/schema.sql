-- ============================================================================
-- RPG Session — Supabase (PostgreSQL) Schema
-- Single-session, realtime RPG system
-- ============================================================================

-- 1. USERS (Mestre + Jogadores)
-- id = Supabase auth.users.id (UUID do auth, nao gerado aqui)
CREATE TABLE users (
  id          UUID PRIMARY KEY,
  name        TEXT NOT NULL,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('master', 'player')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CHARACTERS (ficha fixa — atributos como colunas)
CREATE TABLE characters (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  race           TEXT NOT NULL DEFAULT '',
  biography      TEXT NOT NULL DEFAULT '',
  photo_url      TEXT NOT NULL DEFAULT '',
  notes          TEXT NOT NULL DEFAULT '',

  -- Atributos principais
  hp             INT NOT NULL DEFAULT 0,
  hp_max         INT NOT NULL DEFAULT 0,
  magic          INT NOT NULL DEFAULT 0,
  magic_max      INT NOT NULL DEFAULT 0,
  mana           INT NOT NULL DEFAULT 0,
  mana_max       INT NOT NULL DEFAULT 0,
  xp             INT NOT NULL DEFAULT 0,
  strength       INT NOT NULL DEFAULT 0,
  dexterity      INT NOT NULL DEFAULT 0,
  constitution   INT NOT NULL DEFAULT 0,
  intelligence   INT NOT NULL DEFAULT 0,
  wisdom         INT NOT NULL DEFAULT 0,
  inspiration    INT NOT NULL DEFAULT 0,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para buscar personagens do jogador logado
CREATE INDEX idx_characters_user_id ON characters(user_id);

-- 3. SKILLS (perícias — toggle)
CREATE TABLE skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  proficient    BOOLEAN NOT NULL DEFAULT false,   -- toggle liga/desliga
  bonus         INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_skills_character_id ON skills(character_id);

-- 4. ITEMS (inventário — stackable)
CREATE TABLE items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  quantity      INT NOT NULL DEFAULT 1,            -- empilhável
  effect        JSONB DEFAULT '{}'::jsonb,         -- efeito mecânico (fórmula)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_character_id ON items(character_id);

-- 5. EQUIPPED_ITEMS (slots de equipamento)
CREATE TABLE equipped_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id       UUID REFERENCES items(id) ON DELETE SET NULL,  -- NULL = slot vazio
  slot          TEXT NOT NULL CHECK (slot IN (
                  'left_hand', 'right_hand', 'head', 'body',
                  'legs', 'boots', 'gloves', 'accessory_1', 'accessory_2'
                )),
  UNIQUE (character_id, slot),                     -- um item por slot por personagem
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equipped_character_id ON equipped_items(character_id);

-- 6. ABILITIES (habilidades) — DEPRECATED, usar spells_catalog + character_spells
-- 7. SPELLS (magias) — DEPRECATED, usar spells_catalog + character_spells

-- 8. BUFFS / DEBUFFS (efeitos temporários)
CREATE TABLE buffs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL CHECK (type IN ('buff', 'debuff', 'passive')),
  effect        JSONB DEFAULT '{}'::jsonb,         -- efeito mecânico
  source        TEXT NOT NULL DEFAULT 'manual',     -- 'ability', 'spell', 'item', 'manual'
  duration      INT NOT NULL DEFAULT 0,            -- -1 = permanente, 0 = instantâneo, >0 = rodadas
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ                         -- NULL = permanente ou indefinido
);

CREATE INDEX idx_buffs_character_id ON buffs(character_id);

-- 9. DOCUMENTS (lore / handouts)
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  is_private    BOOLEAN NOT NULL DEFAULT false,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- privado só pro dono
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_owner ON documents(owner_user_id);

-- 10. DICE_ROLLS (histórico de rolagens)
CREATE TABLE dice_rolls (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roller_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id   UUID REFERENCES characters(id) ON DELETE SET NULL,
  notation       TEXT NOT NULL,                     -- ex: "2d10 + STR + 3"
  result         INT NOT NULL,
  details        JSONB DEFAULT '{}'::jsonb,         -- dados individuais + modificadores
  rolled_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rolls_rolled_at ON dice_rolls(rolled_at DESC);

-- 11. CHAT_MESSAGES (chat público, privado e sistema)

-- ============================================================================
-- NOVAS TABELAS: Catálogo Global (master cria, players referenciam)
-- ============================================================================

-- 12. SPELLS_CATALOG (compêndio de magias + habilidades)
CREATE TABLE spells_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  image_url     TEXT NOT NULL DEFAULT '',
  mana_cost     INT NOT NULL DEFAULT 0,
  type          TEXT NOT NULL CHECK (type IN ('spell', 'ability')),
  school        TEXT NOT NULL DEFAULT '',
  element       TEXT NOT NULL DEFAULT '',
  requirement   TEXT NOT NULL DEFAULT '',
  target_type   TEXT NOT NULL DEFAULT 'single',
  level         INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 10),
  is_magic      BOOLEAN NOT NULL DEFAULT true,
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  effect        JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. ITEMS_CATALOG (compêndio de itens)
CREATE TABLE items_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  image_url     TEXT NOT NULL DEFAULT '',
  value         INT NOT NULL DEFAULT 0,
  is_usable     BOOLEAN NOT NULL DEFAULT false,
  effect        JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. CHARACTER_SPELLS (personagem aprendeu magia/habilidade do catálogo)
CREATE TABLE character_spells (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  catalog_id    UUID NOT NULL REFERENCES spells_catalog(id) ON DELETE CASCADE,
  UNIQUE (character_id, catalog_id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_char_spells_char ON character_spells(character_id);

-- 15. CHARACTER_ITEMS (personagem possui item do catálogo + quantidade)
CREATE TABLE character_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  catalog_id    UUID NOT NULL REFERENCES items_catalog(id) ON DELETE CASCADE,
  quantity      INT NOT NULL DEFAULT 1,
  equipped      BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (character_id, catalog_id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_char_items_char ON character_items(character_id);
CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('public', 'whisper', 'system')),
  content         TEXT NOT NULL,
  target_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,  -- só para whisper
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_created_at ON chat_messages(created_at DESC);

-- ============================================================================
-- SUPABASE REALTIME — habilitar publication para todas as tabelas
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE
  users,
  characters,
  skills,
  equipped_items,
  buffs,
  documents,
  dice_rolls,
  chat_messages,
  spells_catalog,
  items_catalog,
  character_spells,
  character_items;
