-- ============================================================================
-- RPG Session — Status Effects Catalog
-- Execute no SQL Editor do Supabase
-- ============================================================================

CREATE TABLE status_effects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  icon          TEXT NOT NULL DEFAULT '&#9889;',
  color         TEXT NOT NULL DEFAULT '#4caf50',
  is_debuff     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: status effects padrão
INSERT INTO status_effects (name, description, icon, color, is_debuff) VALUES
  ('Fortificado', 'Aumenta defesa e resistência', '&#9650;', '#4caf50', false),
  ('Abençoado', 'Bônus em todas as rolagens', '&#9733;', '#ffd740', false),
  ('Invisível', 'Não pode ser visto por inimigos', '&#9670;', '#42a5f5', false),
  ('Acelerado', 'Velocidade de movimento dobrada', '&#9654;', '#69f0ae', false),
  ('Regeneração', 'Recupera HP a cada turno', '&#9829;', '#ff5252', false),
  ('Protegido', 'Barreira mágica absorve dano', '&#9632;', '#7c4dff', false),
  ('Atordoado', 'Não pode agir neste turno', '&#9889;', '#ff9100', true),
  ('Envenenado', 'Perde HP a cada turno', '&#9760;', '#8bc34a', true),
  ('Sangrando', 'Perde HP adicional ao receber dano', '&#9730;', '#f44336', true),
  ('Queimando', 'Sofre dano de fogo por turno', '&#9832;', '#ff5722', true),
  ('Congelado', 'Movimento e ações reduzidos', '&#10052;', '#64b5f6', true),
  ('Paralisado', 'Impossibilitado de agir', '&#9636;', '#ffeb3b', true),
  ('Enfeitiçado', 'Sob controle do conjurador', '&#9788;', '#e040fb', true),
  ('Amaldiçoado', 'Desvantagem em todas as rolagens', '&#9764;', '#424242', true),
  ('Cego', 'Não pode ver alvos ou inimigos', '&#9673;', '#9e9e9e', true),
  ('Silenciado', 'Não pode conjurar magias', '&#10062;', '#795548', true),
  ('Adormecido', 'Inconsciente até sofrer dano', '&#9787;', '#b0bec5', true),
  ('Apavorado', 'Debilitado e não pode se aproximar', '&#9785;', '#d32f2f', true),
  ('Confuso', 'Ações aleatórias a cada turno', '&#8263;', '#ab47bc', true),
  ('Petrificado', 'Transformado em pedra, incapaz de agir', '&#9638;', '#6d4c41', true);

-- Add FK to buffs table
ALTER TABLE buffs ADD COLUMN status_effect_id UUID REFERENCES status_effects(id) ON DELETE SET NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE status_effects;
