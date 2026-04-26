// ============================================================================
// Chat State Model
// ============================================================================

import { ChatMessage } from './rpg-models';

export interface ChatState {
  messages: ChatMessage[];
  maxMessages: number; // limite de mensagens carregadas em memória
  isLoading: boolean;
  error: string | null;
}
