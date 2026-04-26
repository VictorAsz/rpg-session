import { Injectable, inject } from '@angular/core';
import { DiceService } from '../../../domain/dice/services/dice.service';
import { CharacterService } from '../../../domain/character/services/character.service';
import { CharacterStore } from '../../../domain/character/services/character.store';
import type { EffectFormula, Character, SpellCatalog, ItemCatalog } from '../../../shared/models/rpg-models';

export interface EffectContext {
  sourceId: string;
  sourceName: string;
  casterId: string;
  casterCharacterId?: string;
  targetCharacterId?: string;
}

export interface EffectResult {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'modify_attribute' | 'custom';
  targetId: string;
  value: number;
  breakdown: string;
  attribute?: string;
}

@Injectable({ providedIn: 'root' })
export class EffectHandler {
  private readonly diceService = inject(DiceService);
  private readonly characterService = inject(CharacterService);
  private readonly characterStore = inject(CharacterStore);

  async executeEffect(
    effect: EffectFormula,
    context: EffectContext,
  ): Promise<EffectResult | null> {
    if (!effect.formula || !context.casterCharacterId) return null;

    const caster = this.getCharacter(context.casterCharacterId);
    const targetId = context.targetCharacterId ?? context.casterCharacterId;

    // Roll the effect formula using character attributes
    const roll = await this.diceService.roll(
      effect.formula,
      context.casterId,
      context.casterCharacterId,
    );

    const result: EffectResult = {
      type: effect.type,
      targetId,
      value: roll.result,
      breakdown: `${roll.notation} = ${roll.result}`,
    };

    // Apply effect based on type
    const target = this.getCharacter(targetId);
    if (!target) return result;

    switch (effect.type) {
      case 'damage': {
        const newHp = Math.max(0, target.hp - roll.result);
        await this.characterService.updateCharacter(targetId, { hp: newHp });
        break;
      }
      case 'heal': {
        const newHp = Math.min(target.hp_max, target.hp + roll.result);
        await this.characterService.updateCharacter(targetId, { hp: newHp });
        break;
      }
      case 'modify_attribute': {
        if (effect.attribute) {
          const current = (target as any)[effect.attribute] ?? 0;
          await this.characterService.updateCharacter(targetId, {
            [effect.attribute]: Math.max(0, current + roll.result),
          } as Partial<Character>);
        }
        break;
      }
      case 'buff':
      case 'debuff': {
        // Buffs are handled separately via the buffs table
        break;
      }
    }

    return result;
  }

  async castSpell(spell: SpellCatalog, context: EffectContext): Promise<EffectResult | null> {
    const caster = context.casterCharacterId
      ? this.getCharacter(context.casterCharacterId)
      : null;

    if (!caster) return null;

    // Check mana cost
    if (caster.mana < spell.mana_cost) {
      console.warn(`Mana insuficiente: ${caster.mana} < ${spell.mana_cost}`);
      return null;
    }

    // Deduct mana
    await this.characterService.updateCharacter(caster.id, {
      mana: caster.mana - spell.mana_cost,
    });

    // Execute effect
    return this.executeEffect(spell.effect, context);
  }

  async useItem(item: ItemCatalog, context: EffectContext): Promise<EffectResult | null> {
    if (!item.is_usable || !item.effect.formula) return null;
    return this.executeEffect(item.effect, context);
  }

  private getCharacter(id: string): Character | null {
    return this.characterStore.snapshot.characters.find(c => c.id === id) ?? null;
  }
}
