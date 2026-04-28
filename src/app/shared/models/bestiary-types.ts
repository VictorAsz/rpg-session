export const DAMAGE_TYPES = [
  'contundente','corte','perfuracao',
  'fogo','agua','eletrico','veneno',
  'divino','trevas','luz','psiquico',
  'acido','espiritual',
] as const;

export const STATUS_EFFECTS = [
  'medo','ilusao','sangramento','queimadura',
  'congelamento','paralisia','maldicao',
] as const;

export type DamageType = (typeof DAMAGE_TYPES)[number];
export type StatusEffect = (typeof STATUS_EFFECTS)[number];

export type CreatureRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type CreatureClassification = 'beast' | 'humanoid' | 'aberration' | 'spirit' | 'construct';
export type CreatureBiome = 'forest' | 'tundra' | 'swamp' | 'underground' | 'desert' | 'plains' | 'mountains' | 'coastal' | 'urban' | 'volcanic';
export type CreatureDiet = 'carnivore' | 'herbivore' | 'omnivore' | 'arcane';
export type CreatureBehavior = 'aggressive' | 'territorial' | 'social' | 'solitary' | 'hunter' | 'opportunistic';
export type IntelligenceLevel = 'low' | 'medium' | 'high' | 'sentient';

export const RARITY_LABELS: Record<CreatureRarity, string> = {
  common: 'Comum', uncommon: 'Incomum', rare: 'Raro', epic: 'Épico', legendary: 'Lendário',
};

export const RARITY_COLORS: Record<CreatureRarity, string> = {
  common: '#9e9e9e', uncommon: '#4caf50', rare: '#42a5f5', epic: '#ce93d8', legendary: '#ffd740',
};

export const CLASSIFICATION_LABELS: Record<CreatureClassification, string> = {
  beast: 'Fera', humanoid: 'Humanoide', aberration: 'Aberração', spirit: 'Espírito', construct: 'Constructo',
};

export const BIOME_LABELS: Record<CreatureBiome, string> = {
  forest: 'Floresta', tundra: 'Tundra', swamp: 'Pântano', underground: 'Subterrâneo',
  desert: 'Deserto', plains: 'Planície', mountains: 'Montanhas', coastal: 'Costeiro',
  urban: 'Urbano', volcanic: 'Vulcânico',
};

export const DIET_LABELS: Record<CreatureDiet, string> = {
  carnivore: 'Carnívoro', herbivore: 'Herbívoro', omnivore: 'Onívoro', arcane: 'Arcano',
};

export const BEHAVIOR_LABELS: Record<CreatureBehavior, string> = {
  aggressive: 'Agressivo', territorial: 'Territorial', social: 'Social',
  solitary: 'Solitário', hunter: 'Caçador', opportunistic: 'Oportunista',
};

export const INTELLIGENCE_LABELS: Record<IntelligenceLevel, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', sentient: 'Senciente',
};
