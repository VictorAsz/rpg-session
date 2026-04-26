Design Decisions
1. Attributes as flat columns on characters — not a separate table
The sheet is fixed (Vida, Magia, Mana, XP, Força, Destreza, Constituição, Inteligência, Sabedoria, Inspiração). Since it's always 1:1 with a character, columns avoid a join on the most-read table. This is the single biggest win for realtime performance — every HP/mana update is one UPDATE statement, no joins needed.
2. effect field uses JSONB, not a separate effects table
Items, abilities, spells, and buffs all share the same mechanical pattern: a formula + a type. Using JSONB (EffectFormula interface) avoids exploding into effect_types, effect_targets, effect_formulas tables. The Angular frontend evaluates formulas locally ("2d10 + STR_MOD" → parsed and rolled), so the DB just stores the formula string.
3. equipped_items as a junction with UNIQUE(character_id, slot)
An item lives in items (inventory). Equipping it creates an equipped_items row referencing that item + a slot. The unique constraint enforces one item per slot per character. item_id is nullable → a slot can be empty. This enables drag-and-drop equipping without touching inventory.
4. Buffs use duration integer with sentinel values
- -1 = permanent/passive (passive abilities from abilities table get mirrored here)  
- 0 = instantaneous (applied and gone)  
- >0 = rounds remaining  
expires_at is a timestamp for calendar-based expiry. GM can manage manual expiry without needing a combat tracker in MVP.
5. Separate tables per domain, not one giant JSON blob
The architecture uses Supabase Realtime subscriptions per postgres_changes per table. Each domain service subscribes to only its table (characters, skills, items, etc.). A single JSON blob would broadcast the entire character on every change, flooding clients. Separate tables = targeted realtime events.
6. Append-only for dice_rolls and chat_messages
No deletes, no updates — only INSERT. This maximizes realtime throughput and keeps history clean. The store caps in-memory messages (maxMessages/maxRolls) and lazy-loads older records from Postgres.
7. users.password stored as plaintext
Explicitly requested: "apenas usuario e senha(não precisa de segurança)". This is for a single private table, not public auth. Supabase login would still use its own auth but the user/password column exists for simple session join codes.
8. documents table is flat, not character-scoped
Documents are handouts/lore, not tied to a character. is_private + owner_user_id enables GM to share selectively (whisper-like for lore). Body is plain text since the MVP doesn't need rich text.
---
Files created:
File	Purpose
docs/schema.sql	Full PostgreSQL schema (11 tables + indexes + realtime publication)
src/app/shared/models/base-entity.model.ts	BaseEntity (id, created_at)
src/app/shared/models/rpg-models.ts	All 11 entity interfaces + EffectFormula, EquipmentSlot, BuffType, BuffSource, MessageType
src/app/shared/models/character-state.model.ts	CharacterSheet (aggregated) + CharacterState
src/app/shared/models/session-state.model.ts	SessionState
src/app/shared/models/chat-state.model.ts	ChatState
src/app/shared/models/dice-state.model.ts	DiceState
src/app/shared/models/index.ts	Barrel export

