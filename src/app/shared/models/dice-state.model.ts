// ============================================================================
// Dice State Model
// ============================================================================

import { DiceRoll } from './rpg-models';

export interface DiceState {
  rolls: DiceRoll[]; // histórico de rolagens
  maxRolls: number; // limite em memória
  isLoading: boolean;
  error: string | null;
}
