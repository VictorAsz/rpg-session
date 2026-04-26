Realtime Sync Layer — Design Summary
1. Angular Service for Realtime Subscriptions
RealtimeService (src/app/core/services/realtime.service.ts:34-62) wraps Supabase Realtime channels into RxJS Observables:
connect(sessionId)      → cria channel supabase.channel(`session:${id}`)
subscribeToChannel()    → ativa o channel
onChanges<T>(table)     → Observable<RealtimeEvent<T>>  (postgres_changes)
onBroadcast<T>(event)   → Observable<T>                 (broadcast efêmero)
broadcast<T>(event, p)  → envia evento efêmero
disconnect()            → remove channel
Key design: onChanges e onBroadcast usam takeUntil(this.destroy$) — quando o serviço é destruído (ngOnDestroy), todas as subscriptions são canceladas automaticamente. Zero memory leaks.
2. Character Update Subscription
CharacterService.subscribeToRealtime() (character.service.ts:66-104) registra 7 listeners:
this.realtime.onChanges<Character>('characters', '*')
  .subscribe(e => this.handleRemoteChange(e, 'character'));
// skills, items, equipped_items, abilities, spells, buffs — mesmo padrão
Cada evento cai no router handleRemoteChange que despacha:
- INSERT / UPDATE → store.upsertX(entity) (merge atômico)
- DELETE → store.removeX(id, characterId)
3. Dice Roll Subscription (duas camadas)
Camada	Canal
Persistência	postgres_changes na tabela dice_rolls
Efêmera	broadcast('dice:rolled')
Fluxo completo de uma rolagem:
Jogador A clica "2d10+STR"
  → DiceService.roll()
      → evaluateNotation()          // lógica local (Angular)
      → supabase.insert()           // persiste (histórico)
      → store.addRoll()             // UI local atualiza instantaneamente
      → realtime.broadcast()        // sinal efêmero para animações
Jogador B recebe:
  → postgres_changes: INSERT        // store.addRoll() → async pipe renderiza resultado
  → broadcast: 'dice:rolled'        // dispara animação de dado rolando
4. Merge Strategy (remote → local state)
O fluxo de merge é sempre unidirecional e idempotente:
Supabase Realtime
  → RealtimeService.onChanges (Observable<RealtimeEvent<T>>)
    → CharacterService.handleRemoteChange
      → CharacterStore.upsertX() / removeX()
        → BehaviorSubject.next({ ...snapshot, ...patch })
          → | async pipe → UI re-render
Operações de upsert no Store (character.store.ts):
upsertSkill(skill: Skill): void {
  const sheet = this.getOrCreateSheet(skill.character_id);
  const idx = sheet.skills.findIndex(sk => sk.id === skill.id);
  sheet.skills = idx >= 0
    ? sheet.skills.map((sk, i) => i === idx ? skill : sk)  // substitui
    : [...sheet.skills, skill];                             // adiciona
  this.commitSheet(skill.character_id, sheet);
}
Toda mutação no store é atômica: snapshot → spread → patch. O BehaviorSubject emite o novo estado e distinctUntilChanged evita re-renders desnecessários.
5. Race Condition Prevention
Problema: Jogador A edita HP para 50. Jogador B edita o mesmo HP para 30. Ambas chegam via realtime quase simultaneamente. Quem ganha?
Solução no MVP (simples, suficiente para single-session):
1. Local-write-first: Quando um jogador escreve, o store local atualiza antes do Supabase responder. Isso elimina lag percebido.
2. Supabase é a verdade: O banco resolve conflitos (último UPDATE vence). Quando o realtime devolve o dado salvo, todos os clientes convergem.
3. Self-skip implícito: Como o upsert no store é por id, re-aplicar o mesmo dado que você acabou de escrever produz o mesmo estado final — sem flicker visual porque distinctUntilChanged bloqueia emissões idênticas.
4. Ordem garantida: O Supabase Realtime entrega eventos na ordem do commit do Postgres (WAL). Não há cenário onde dois clientes vejam ordens diferentes para a mesma linha.
Para caso futuro de conflitos complexos (ex: GM e jogador editando simultaneamente):
- Adicionar coluna version (integer) na tabela characters
- Cada UPDATE faz SET version = version + 1 WHERE version = <local_version>
- Se version local está atrasada, o Supabase retorna erro → frontend faz merge ou avisa
---
Memory Leak Prevention (resumo)
Mecanismo
takeUntil(this.destroy$)
takeUntil(this.destroy$) no Store.select()
Subject.complete() no Store.destroy()
RealtimeService.ngOnDestroy() remove channel
Domain services implement OnDestroy
Files created
File
src/environments/environment.ts
src/environments/environment.development.ts
src/app/core/services/supabase.service.ts
src/app/core/services/realtime.service.ts
src/app/shared/models/realtime-event.model.ts
src/app/domain/base/store.ts
src/app/domain/base/index.ts
src/app/domain/character/services/character.store.ts
src/app/domain/character/services/character.service.ts
src/app/domain/character/index.ts
src/app/domain/dice/services/dice.store.ts
src/app/domain/dice/services/dice.service.ts
src/app/domain/dice/index.ts