// ============================================================================
// Session State Model
// ============================================================================

import { User } from './rpg-models';

export interface SessionState {
  currentUser: User | null;
  users: User[]; // todos os usuários conectados (mestre + jogadores)
  isLoading: boolean;
  error: string | null;
}
