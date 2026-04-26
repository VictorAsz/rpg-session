  ---
  1. Folder Structure

  src/
  ├── app/
  │   ├── core/                          # Infraestrutura global (singletons)
  │   │   └── services/
  │   │       ├── supabase.service.ts    # Wrapper do cliente Supabase
  │   │       └── realtime.service.ts    # Gerencia subscriptions Supabase
  │   │
  │   ├── shared/                        # Componentes visuais reutilizáveis
  │   │   ├── components/
  │   │   ├── pipes/
  │   │   └── models/
  │   │       └── base-entity.model.ts   # Interface comum (id, created_at, etc.)
  │   │
  │   ├── domain/                        # Lógica de negócio (coração do app)
  │   │   ├── session/
  │   │   │   ├── models/
  │   │   │   │   ├── session.model.ts
  │   │   │   │   └── session-state.model.ts
  │   │   │   ├── services/
  │   │   │   │   ├── session.store.ts
  │   │   │   │   └── session.service.ts
  │   │   │   └── index.ts              # barrel export
  │   │   │
  │   │   ├── character/
  │   │   │   ├── models/
  │   │   │   │   ├── character.model.ts
  │   │   │   │   └── character-state.model.ts
  │   │   │   ├── services/
  │   │   │   │   ├── character.store.ts
  │   │   │   │   └── character.service.ts
  │   │   │   └── index.ts
  │   │   │
  │   │   ├── chat/
  │   │   │   ├── models/
  │   │   │   │   ├── message.model.ts
  │   │   │   │   └── chat-state.model.ts
  │   │   │   ├── services/
  │   │   │   │   ├── chat.store.ts
  │   │   │   │   └── chat.service.ts
  │   │   │   └── index.ts
  │   │   │
  │   │   ├── dice/
  │   │   │   ├── models/
  │   │   │   │   └── dice-roll.model.ts
  │   │   │   ├── services/
  │   │   │   │   ├── dice.store.ts
  │   │   │   │   └── dice.service.ts
  │   │   │   └── index.ts
  │   │   │
  │   │   ├── combat/
  │   │   │   ├── models/
  │   │   │   │   ├── combat-encounter.model.ts
  │   │   │   │   └── combat-state.model.ts
  │   │   │   ├── services/
  │   │   │   │   ├── combat.store.ts
  │   │   │   │   └── combat.service.ts
  │   │   │   └── index.ts
  │   │   │
  │   │   └── map/
  │   │       ├── models/
  │   │       │   ├── grid.model.ts
  │   │       │   └── token.model.ts
  │   │       ├── services/
  │   │       │   ├── map.store.ts
  │   │       │   └── map.service.ts
  │   │       └── index.ts
  │   │
  │   ├── features/                     # Páginas e componentes específicos
  │   │   ├── session-lobby/
  │   │   │   └── session-lobby.component.ts
  │   │   ├── game-table/
  │   │   │   ├── game-table.component.ts
  │   │   │   ├── components/           # sub-componentes privados da mesa
  │   │   │   │   ├── player-list/
  │   │   │   │   └── game-toolbar/
  │   │   │   └── game-table.guard.ts
  │   │   ├── character-sheet/
  │   │   ├── dice-roller/
  │   │   ├── chat-panel/
  │   │   ├── combat-tracker/
  │   │   └── game-map/
  │   │
  │   └── layout/
  │       ├── main-layout.component.ts  # Shell: header + router-outlet
  │       └── game-layout.component.ts  # Shell com sidebar de ferramentas
  │
  ├── environments/
  └── assets/

  Regra de ouro: domain/ nunca importa de features/. features/ consome domain/ via services e async pipe. core/ é injetado em qualquer
  camada.

  ---
  2. Core Modules & Services Breakdown

  SupabaseService (core)

  @Injectable({ providedIn: 'root' })
  export class SupabaseService {
    private supabase = createClient(env.url, env.key);

    // Métodos genéricos de CRUD — nenhuma lógica de negócio aqui
    fetchAll<T>(table: string, query?: string): Promise<T[]>;
    fetchById<T>(table: string, id: string): Promise<T>;
    insert<T>(table: string, payload: Partial<T>): Promise<T>;
    update<T>(table: string, id: string, payload: Partial<T>): Promise<T>;
    delete(table: string, id: string): Promise<void>;
  }

  Propósito: ser o único ponto de contato com o Supabase client. Se migrar para backend próprio, troca-se só essa classe.

  RealtimeService (core)

  @Injectable({ providedIn: 'root' })
  export class RealtimeService {
    private channel: RealtimeChannel | null = null;

    connect(sessionId: string): void;
    disconnect(): void;

    // Observable que emite eventos de mudança do Postgres
    onChanges<T>(table: string, event: 'INSERT' | 'UPDATE' | 'DELETE'): Observable<T>;

    // Para eventos custom (dice rolls, pings)
    broadcast<T>(event: string, payload: T): void;
    onBroadcast<T>(event: string): Observable<T>;
  }

  Propósito: isolar a API de realtime do Supabase. Cada domain service usa onChanges para reagir a mudanças e onBroadcast para eventos
  efêmeros (rolagem de dado, typing indicator).

  Domain Services (um por domínio)

  Cada domínio tem um service (comandos/orquestração) e um store (estado reativo):

  ┌───────────┬──────────────────┬────────────────┬────────────────────────────────────┐
  │  Domínio  │     Service      │     Store      │          Responsabilidade          │
  ├───────────┼──────────────────┼────────────────┼────────────────────────────────────┤
  │ Session   │ SessionService   │ SessionStore   │ Criar/entrar/encerrar sessão       │
  ├───────────┼──────────────────┼────────────────┼────────────────────────────────────┤
  │ Character │ CharacterService │ CharacterStore │ CRUD de personagens do jogador     │
  ├───────────┼──────────────────┼────────────────┼────────────────────────────────────┤
  │ Chat      │ ChatService      │ ChatStore      │ Enviar/receber mensagens           │
  ├───────────┼──────────────────┼────────────────┼────────────────────────────────────┤
  │ Dice      │ DiceService      │ DiceStore      │ Rolar dados, histórico de rolagens │
  ├───────────┼──────────────────┼────────────────┼────────────────────────────────────┤
  │ Combat    │ CombatService    │ CombatStore    │ Iniciativa, turnos, condições      │
  ├───────────┼──────────────────┼────────────────┼────────────────────────────────────┤
  │ Map       │ MapService       │ MapStore       │ Grid, tokens, fog of war           │
  └───────────┴──────────────────┴────────────────┴────────────────────────────────────┘

  ---
  3. State Management Strategy (RxJS puro)

  Padrão Store com BehaviorSubject

  // session-state.model.ts
  export interface SessionState {
    session: Session | null;
    participants: Participant[];
    isLoading: boolean;
    error: string | null;
  }

  // session.store.ts
  @Injectable({ providedIn: 'root' })
  export class SessionStore {
    private readonly state$ = new BehaviorSubject<SessionState>({
      session: null,
      participants: [],
      isLoading: false,
      error: null,
    });

    // Selectors — derivam slices do estado com distinctUntilChanged
    readonly session$    = this.select(s => s.session);
    readonly players$    = this.select(s => s.participants.filter(p => p.role === 'player'));
    readonly isLoading$  = this.select(s => s.isLoading);
    readonly error$      = this.select(s => s.error);

    // Snapshot síncrono para operações que precisam do estado atual
    get snapshot(): SessionState { return this.state$.getValue(); }

    // Mutação atômica
    patch(partial: Partial<SessionState>): void {
      this.state$.next({ ...this.snapshot, ...partial });
    }

    // Selector genérico
    private select<R>(project: (s: SessionState) => R): Observable<R> {
      return this.state$.pipe(map(project), distinctUntilChanged());
    }
  }

  Como os services orquestram

  // session.service.ts
  @Injectable({ providedIn: 'root' })
  export class SessionService {
    constructor(
      private supabase: SupabaseService,
      private realtime: RealtimeService,
      private store: SessionStore,
    ) {}

    async createSession(name: string, gmId: string): Promise<void> {
      this.store.patch({ isLoading: true, error: null });

      try {
        const session = await this.supabase.insert<Session>('sessions', { name, gm_id: gmId });
        this.store.patch({ session, isLoading: false });
        this.realtime.connect(session.id); // ativa subscriptions
      } catch (err) {
        this.store.patch({ isLoading: false, error: 'Falha ao criar sessão' });
      }
    }

    // Chamado pelo RealtimeService quando chega evento de fora
    handleRemoteUpdate(session: Session): void {
      this.store.patch({ session });
    }
  }

  Por que isso escala?

  - Cada Store é isolado — SessionStore não sabe que CombatStore existe
  - Comunicação entre domínios acontece no componente, compondo streams:

  // game-table.component.ts
  @Component({
    template: `
      <app-combat-tracker [encounter]="activeEncounter$ | async" />
      <app-chat-panel [messages]="messages$ | async" />
    `,
  })
  export class GameTableComponent {
    activeEncounter$ = this.combatStore.activeEncounter$;
    messages$ = this.chatStore.messages$;
  }

  - Nada de NgRx, nada de boilerplate de actions/reducers. patch() já é a action + reducer.

  ---
  4. Realtime Sync Strategy

  Conexão e ciclo de vida

  SessionService.createSession()
    └─> SupabaseService.insert('sessions', ...)
          └─> RealtimeService.connect(sessionId)
                ├─> channel = supabase.channel(`session:${id}`)
                ├─> subscribe to Postgres changes em cada tabela
                └─> cada domain service registra seus listeners

  Mapeamento tabela → store

  ┌─────────────────┬──────────────────┬──────────────────────────────────────┐
  │ Tabela Supabase │   Listener em    │            Ação no store             │
  ├─────────────────┼──────────────────┼──────────────────────────────────────┤
  │ sessions        │ SessionService   │ sessionStore.patch({ session })      │
  ├─────────────────┼──────────────────┼──────────────────────────────────────┤
  │ participants    │ SessionService   │ sessionStore.patch({ participants }) │
  ├─────────────────┼──────────────────┼──────────────────────────────────────┤
  │ characters      │ CharacterService │ characterStore.upsert(character)     │
  ├─────────────────┼──────────────────┼──────────────────────────────────────┤
  │ messages        │ ChatService      │ chatStore.addMessage(message)        │
  ├─────────────────┼──────────────────┼──────────────────────────────────────┤
  │ encounters      │ CombatService    │ combatStore.patch({ encounter })     │
  ├─────────────────┼──────────────────┼──────────────────────────────────────┤
  │ map_tokens      │ MapService       │ mapStore.syncTokens(tokens)          │
  └─────────────────┴──────────────────┴──────────────────────────────────────┘

  Implementação do RealtimeService.onChanges

  onChanges<T extends BaseEntity>(table: string): Observable<RealtimeEvent<T>> {
    return new Observable(subscriber => {
      this.channel!.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => subscriber.next({
          event: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          old: payload.old as T,
          new: payload.new as T,
        }),
      ).subscribe();
    });
  }

  Broadcast para eventos efêmeros

  Nem tudo precisa ser persistido. Rolagens de dado e "fulano está digitando" usam o broadcast do Supabase (não Postgres changes),
  porque são transitórios:

  // dice.service.ts
  roll(notation: string): void {
    const result = this.evaluate(notation);        // lógica local
    this.store.addRoll({ notation, result });
    this.realtime.broadcast('dice:rolled', {       // broadcast aos outros
      playerId: this.sessionStore.currentPlayerId,
      notation,
      result,
    });
  }

  Fluxo completo de uma rolagem de dado

  Jogador A clica "roll 2d6"
    → DiceService.roll('2d6')
        → DiceStore.addRoll({ player: A, result: 8 })     // UI local atualiza imediatamente
        → SupabaseService.insert('dice_rolls', {...})      // persiste (histórico)
        → RealtimeService.broadcast('dice:rolled', {...})  // broadcast efêmero

  Jogador B recebe broadcast
    → DiceService.onDiceRolled$ detecta evento
        → DiceStore.addRoll({ player: A, result: 8 })     // UI do B atualiza

  ---
  5. Data Flow Diagram (Textual)

  ┌──────────────────────────────────────────────────────────────┐
  │                        COMPONENT                             │
  │  Usa | async pipe para consumir estado                       │
  │  Chama service.metodo() em eventos de UI                     │
  └────────────┬───────────────────────────────┬─────────────────┘
               │                               │
      ┌────────▼────────┐             ┌────────▼────────┐
      │  DOMAIN SERVICE │             │    STORE        │
      │                 │  patch()    │                 │
      │  Orquestra      │───────────▶│  BehaviorSubject│──▶ async pipe
      │  Regras de      │            │  Selectors      │    rerender
      │  negócio        │            └─────────────────┘
      └───┬─────────┬───┘
          │         │
     ┌────▼──┐ ┌───▼────────┐
     │Supabase│ │Realtime    │
     │Service │ │Service     │
     │        │ │            │
     │CRUD    │ │Subscribe   │
     │puro    │ │Broadcast   │
     └───┬────┘ └──┬─────────┘
         │         │
         │   ┌─────▼──────┐
         │   │  Supabase  │
         └──►│  Backend   │
             │  (Postgres │
             │  + Realtime│
             │  Engine)   │
             └────────────┘

  Fluxo de ESCRITA (Player A faz ação):
    Component → DomainService → SupabaseService.insert/update → Supabase
                             └→ Store.patch() → UI local atualiza

  Fluxo de LEITURA REMOTA (Player B recebe ação de A):
    Supabase → RealtimeService.onChanges → DomainService.handleRemote → Store.patch() → UI de B atualiza

  Princípio chave: o estado no Store é sempre a verdade. Seja uma ação local ou remota, o caminho final é Store.patch(). Isso garante
  que a UI reage de forma idêntica independente da origem da mudança.

  ---
  6. Naming Conventions

  Arquivos

  ┌─────────────┬──────────────────────────┬──────────────────────────┐
  │    Tipo     │          Padrão          │         Exemplo          │
  ├─────────────┼──────────────────────────┼──────────────────────────┤
  │ Model       │ <entidade>.model.ts      │ session.model.ts         │
  ├─────────────┼──────────────────────────┼──────────────────────────┤
  │ State model │ <domínio>-state.model.ts │ combat-state.model.ts    │
  ├─────────────┼──────────────────────────┼──────────────────────────┤
  │ Store       │ <domínio>.store.ts       │ character.store.ts       │
  ├─────────────┼──────────────────────────┼──────────────────────────┤
  │ Service     │ <domínio>.service.ts     │ dice.service.ts          │
  ├─────────────┼──────────────────────────┼──────────────────────────┤
  │ Component   │ <feature>.component.ts   │ dice-roller.component.ts │
  ├─────────────┼──────────────────────────┼──────────────────────────┤
  │ Barrel      │ index.ts                 │ domain/session/index.ts  │
  ├─────────────┼──────────────────────────┼──────────────────────────┤
  │ Guard       │ <feature>.guard.ts       │ game-table.guard.ts      │
  └─────────────┴──────────────────────────┴──────────────────────────┘

  TypeScript (interfaces, classes, métodos)

  // Interfaces de entidade: nome simples, sem prefixo
  interface Session { id: string; name: string; gmId: string; status: SessionStatus; }
  interface Character { id: string; name: string; sheet: CharacterSheet; }

  // Enums: PascalCase, singular
  enum SessionStatus { Lobby, Active, Ended }

  // State: sufixo State sempre
  interface SessionState { session: Session | null; participants: Participant[]; }

  // Stores: sufixo Store, selectors como observables com $
  class SessionStore {
    readonly session$: Observable<Session | null>;
    readonly activeParticipants$: Observable<Participant[]>;
    get snapshot(): SessionState;
    patch(partial: Partial<SessionState>): void;
  }

  // Services: verbos de ação claros
  class SessionService {
    createSession(): Promise<void>;    // verbo + entidade
    joinSession(id: string): void;
    endSession(): void;
    handleRemoteUpdate(session: Session): void;  // prefixo handle para callbacks remotos
  }

  // Componentes: sufixo Component
  class DiceRollerComponent {
    roll(): void;            // ação iniciada pelo usuário
    onResult(result: DiceResult): void;  // prefixo on para eventos de output
  }

  Regras de consistência:
  - select() nos stores retorna Observable com $ no nome: messages$, activeEncounter$
  - Serviços nunca expõem o BehaviorSubject diretamente — sempre via selector ou snapshot
  - Métodos em services que vêm do realtime usam prefixo handle: handleRemoteInsert, handleRemoteDelete
  - Modelos de estado são sempre interfaces separadas do modelo de entidade (ex: Character ≠ CharacterState)