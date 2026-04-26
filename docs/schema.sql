-- ============================================================================
-- RPG Session — Supabase (PostgreSQL) Schema
-- Single-session, realtime RPG system
-- ============================================================================

-- 1. USERS (Mestre + Jogadores)
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  password    TEXT NOT NULL,              -- simples, sem hash (conforme requisito)
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

-- 6. ABILITIES (habilidades)
CREATE TABLE abilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  effect        JSONB DEFAULT '{}'::jsonb,         -- fórmula de efeito
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_abilities_character_id ON abilities(character_id);

-- 7. SPELLS (magias — custo de mana)
CREATE TABLE spells (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id  UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  mana_cost     INT NOT NULL DEFAULT 0,
  effect        JSONB DEFAULT '{}'::jsonb,         -- efeito automático ao conjurar
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_spells_character_id ON spells(character_id);

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
  rolled_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rolls_rolled_at ON dice_rolls(rolled_at DESC);

-- 11. CHAT_MESSAGES (chat público, privado e sistema)
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
  items,
  equipped_items,
  abilities,
  spells,
  buffs,
  documents,
  dice_rolls,
  chat_messages;
