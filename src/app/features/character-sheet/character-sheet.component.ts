import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CharacterService } from '../../domain/character/services/character.service';
import { CharacterStore } from '../../domain/character/services/character.store';
import type { CharacterSheet } from '../../shared/models/character-state.model';
import type {
  Character,
  Skill,
  Item,
  EquippedItem,
  Ability,
  Spell,
  Buff,
  EquipmentSlot,
} from '../../shared/models/rpg-models';

const EQUIPMENT_SLOTS: { key: EquipmentSlot; label: string }[] = [
  { key: 'head', label: 'Cabeça' },
  { key: 'body', label: 'Corpo' },
  { key: 'left_hand', label: 'Mão Esquerda' },
  { key: 'right_hand', label: 'Mão Direita' },
  { key: 'gloves', label: 'Luvas' },
  { key: 'legs', label: 'Pernas' },
  { key: 'boots', label: 'Botas' },
  { key: 'accessory_1', label: 'Acessório 1' },
  { key: 'accessory_2', label: 'Acessório 2' },
];

interface CharacterForm {
  name: FormControl<string>;
  race: FormControl<string>;
  biography: FormControl<string>;
  notes: FormControl<string>;
  hp: FormControl<number>;
  hp_max: FormControl<number>;
  magic: FormControl<number>;
  magic_max: FormControl<number>;
  mana: FormControl<number>;
  mana_max: FormControl<number>;
  xp: FormControl<number>;
  strength: FormControl<number>;
  dexterity: FormControl<number>;
  constitution: FormControl<number>;
  intelligence: FormControl<number>;
  wisdom: FormControl<number>;
  inspiration: FormControl<number>;
}

@Component({
  selector: 'app-character-sheet',
  imports: [ReactiveFormsModule, AsyncPipe],
  templateUrl: './character-sheet.component.html',
  styleUrls: ['./character-sheet.component.scss'],
})
export class CharacterSheetComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly characterService = inject(CharacterService);
  private readonly store = inject(CharacterStore);
  private readonly destroy$ = new Subject<void>();

  readonly isMaster = this.auth.isMaster;
  readonly activeTab = signal<'attributes' | 'inventory' | 'skills' | 'abilities' | 'spells' | 'buffs' | 'notes'>('attributes');
  readonly remoteChanged = signal(false);
  readonly saving = signal(false);

  readonly form: FormGroup<CharacterForm>;
  readonly characterId = signal<string | null>(null);
  readonly sheet = signal<CharacterSheet | null>(null);

  readonly showAddSkill = signal(false);
  readonly showAddItem = signal(false);
  readonly showAddAbility = signal(false);
  readonly showAddSpell = signal(false);
  readonly showAddBuff = signal(false);

  constructor() {
    this.form = this.buildForm();
    this.characterId.set(this.route.snapshot.paramMap.get('id'));

    const id = this.characterId();
    if (!id) {
      this.router.navigate(['/table']);
      return;
    }

    this.store.characterSheet$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((sheet) => this.onSheetChanged(sheet));

    this.characterService.loadAllCharacters();

    this.form.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.form.dirty),
        debounceTime(600),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      )
      .subscribe(() => this.saveAttributes());
  }

  private buildForm(): FormGroup<CharacterForm> {
    return this.fb.group<CharacterForm>({
      name: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
      race: this.fb.control('', { nonNullable: true }),
      biography: this.fb.control('', { nonNullable: true }),
      notes: this.fb.control('', { nonNullable: true }),
      hp: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      hp_max: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      magic: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      magic_max: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      mana: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      mana_max: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      xp: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      strength: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      dexterity: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      constitution: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      intelligence: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      wisdom: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
      inspiration: this.fb.control(0, { nonNullable: true, validators: [Validators.min(0)] }),
    });
  }

  // ── Realtime → Form Merge ──────────────────────────────────────────

  private onSheetChanged(sheet: CharacterSheet | undefined): void {
    if (!sheet) return;
    this.sheet.set(sheet);

    if (!this.form.dirty) {
      this.patchForm(sheet.character);
      this.remoteChanged.set(false);
    } else {
      this.remoteChanged.set(true);
    }
  }

  private patchForm(char: Character): void {
    this.form.patchValue(
      {
        name: char.name,
        race: char.race,
        biography: char.biography,
        notes: char.notes,
        hp: char.hp,
        hp_max: char.hp_max,
        magic: char.magic,
        magic_max: char.magic_max,
        mana: char.mana,
        mana_max: char.mana_max,
        xp: char.xp,
        strength: char.strength,
        dexterity: char.dexterity,
        constitution: char.constitution,
        intelligence: char.intelligence,
        wisdom: char.wisdom,
        inspiration: char.inspiration,
      },
      { emitEvent: false },
    );
    this.form.markAsPristine();
  }

  acceptRemoteChanges(): void {
    const sheet = this.sheet();
    if (sheet) {
      this.patchForm(sheet.character);
      this.remoteChanged.set(false);
    }
  }

  // ── Attribute Save ─────────────────────────────────────────────────

  private async saveAttributes(): Promise<void> {
    if (this.form.invalid || !this.isMaster()) return;

    const id = this.characterId();
    if (!id) return;

    const raw = this.form.getRawValue();
    const changes: Partial<Character> = {};

    for (const key of Object.keys(raw) as Array<keyof typeof raw>) {
      changes[key as keyof Character] = raw[key] as never;
    }

    this.saving.set(true);
    try {
      await this.characterService.updateCharacter(id, changes);
      this.form.markAsPristine();
    } catch {
      // ignore — realtime will correct
    } finally {
      this.saving.set(false);
    }
  }

  // ── Inventory Actions ──────────────────────────────────────────────

  async addItem(name: string, description: string, quantity: number): Promise<void> {
    const id = this.characterId();
    if (!id) return;
    await this.characterService.addItem({
      character_id: id,
      name,
      description,
      quantity,
      effect: { type: 'custom', formula: '' },
    });
    this.showAddItem.set(false);
  }

  async updateItemQty(item: Item, delta: number): Promise<void> {
    const qty = Math.max(0, item.quantity + delta);
    if (qty === 0) {
      await this.characterService.deleteItem(item.id, item.character_id);
    } else {
      await this.characterService.updateItem(item.id, { quantity: qty });
    }
  }

  async deleteItem(item: Item): Promise<void> {
    await this.characterService.deleteItem(item.id, item.character_id);
  }

  // ── Equipment Actions ──────────────────────────────────────────────

  async equipToSlot(itemId: string, slot: EquipmentSlot): Promise<void> {
    const id = this.characterId();
    if (!id) return;
    await this.characterService.equipItem(id, itemId, slot);
  }

  async unequipSlot(equipped: EquippedItem): Promise<void> {
    await this.characterService.unequipItem(equipped.id, equipped.character_id);
  }

  getEquippedForSlot(slot: EquipmentSlot): EquippedItem | undefined {
    return this.sheet()?.equipment.find((e) => e.slot === slot);
  }

  getItemName(itemId: string | null): string {
    if (!itemId) return '—';
    return this.sheet()?.items.find((i) => i.id === itemId)?.name ?? '—';
  }

  // ── Skills Actions ─────────────────────────────────────────────────

  async addSkill(name: string, bonus: number): Promise<void> {
    const id = this.characterId();
    if (!id) return;
    await this.characterService.addSkill({
      character_id: id,
      name,
      proficient: false,
      bonus,
    });
    this.showAddSkill.set(false);
  }

  async toggleSkill(skill: Skill): Promise<void> {
    await this.characterService.updateSkill(skill.id, { proficient: !skill.proficient });
  }

  async deleteSkill(skill: Skill): Promise<void> {
    await this.characterService.deleteSkill(skill.id, skill.character_id);
  }

  // ── Abilities Actions ──────────────────────────────────────────────

  async addAbility(name: string, description: string): Promise<void> {
    const id = this.characterId();
    if (!id) return;
    await this.characterService.addAbility({
      character_id: id,
      name,
      description,
      effect: { type: 'custom', formula: '' },
    });
    this.showAddAbility.set(false);
  }

  async deleteAbility(ability: Ability): Promise<void> {
    await this.characterService.deleteAbility(ability.id, ability.character_id);
  }

  // ── Spells Actions ─────────────────────────────────────────────────

  async addSpell(name: string, description: string, manaCost: number): Promise<void> {
    const id = this.characterId();
    if (!id) return;
    await this.characterService.addSpell({
      character_id: id,
      name,
      description,
      mana_cost: manaCost,
      effect: { type: 'custom', formula: '' },
    });
    this.showAddSpell.set(false);
  }

  async deleteSpell(spell: Spell): Promise<void> {
    await this.characterService.deleteSpell(spell.id, spell.character_id);
  }

  // ── Buffs Actions ──────────────────────────────────────────────────

  async addBuff(name: string, description: string, duration: number): Promise<void> {
    const id = this.characterId();
    if (!id) return;
    await this.characterService.addBuff({
      character_id: id,
      name,
      description,
      type: duration < 0 ? 'passive' : 'buff',
      effect: { type: 'custom', formula: '' },
      source: 'manual',
      duration,
      expires_at: null,
    });
    this.showAddBuff.set(false);
  }

  async deleteBuff(buff: Buff): Promise<void> {
    await this.characterService.deleteBuff(buff.id, buff.character_id);
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  tabList: Array<'attributes' | 'inventory' | 'skills' | 'abilities' | 'spells' | 'buffs' | 'notes'> =
    ['attributes', 'inventory', 'skills', 'abilities', 'spells', 'buffs', 'notes'];

  tabLabel(tab: string): string {
    const labels: Record<string, string> = {
      attributes: 'Atributos',
      inventory: 'Inventário',
      skills: 'Perícias',
      abilities: 'Habilidades',
      spells: 'Magias',
      buffs: 'Buffs/Debuffs',
      notes: 'Notas',
    };
    return labels[tab] ?? tab;
  }

  canEdit(): boolean {
    return this.isMaster();
  }

  canEditAttributes(): boolean {
    return this.isMaster();
  }

  get equipmentSlots(): typeof EQUIPMENT_SLOTS {
    return EQUIPMENT_SLOTS;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
