import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CharacterService } from '../../domain/character/services/character.service';
import { CharacterStore } from '../../domain/character/services/character.store';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
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

const STATS = [
  { key: 'strength' as const, label: 'Força' },
  { key: 'dexterity' as const, label: 'Destreza' },
  { key: 'constitution' as const, label: 'Constituição' },
  { key: 'intelligence' as const, label: 'Inteligência' },
  { key: 'wisdom' as const, label: 'Sabedoria' },
];

interface CharForm {
  name: string; race: string; biography: string; notes: string;
  hp: number; hp_max: number;
  magic: number; magic_max: number;
  mana: number; mana_max: number;
  xp: number;
  strength: number; dexterity: number; constitution: number;
  intelligence: number; wisdom: number; inspiration: number;
}

@Component({
  selector: 'app-character-sheet',
  imports: [ReactiveFormsModule, AsyncPipe, RouterLink, AppSidebarComponent],
  templateUrl: './character-sheet.component.html',
  styleUrls: ['./character-sheet.component.scss'],
})
export class CharacterSheetComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  private readonly characterService = inject(CharacterService);
  private readonly store = inject(CharacterStore);
  private readonly destroy$ = new Subject<void>();

  readonly sidebarOpen = signal(true);
  readonly activeTab = signal<'stats' | 'inventory' | 'skills' | 'abilities' | 'spells' | 'buffs' | 'notes'>('stats');
  readonly bottomTab = signal<'buffs' | 'skills' | 'inventory' | 'abilities' | 'spells'>('buffs');
  readonly bottomTabs: { key: 'buffs' | 'skills' | 'inventory' | 'abilities' | 'spells'; label: string }[] = [
    { key: 'buffs', label: 'Efeitos' },
    { key: 'skills', label: 'Perícias' },
    { key: 'inventory', label: 'Inventário' },
    { key: 'abilities', label: 'Habilidades' },
    { key: 'spells', label: 'Magias' },
  ];
  readonly remoteChanged = signal(false);
  readonly saving = signal(false);
  readonly showAddSkill = signal(false);
  readonly showAddItem = signal(false);
  readonly showAddAbility = signal(false);
  readonly showAddSpell = signal(false);
  readonly showAddBuff = signal(false);

  readonly form: FormGroup;
  readonly characterId = signal<string | null>(null);
  readonly sheet = signal<CharacterSheet | null>(null);

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      race: [''],
      biography: [''],
      notes: [''],
      hp: [0, [Validators.min(0)]],
      hp_max: [0, [Validators.min(0)]],
      magic: [0, [Validators.min(0)]],
      magic_max: [0, [Validators.min(0)]],
      mana: [0, [Validators.min(0)]],
      mana_max: [0, [Validators.min(0)]],
      xp: [0, [Validators.min(0)]],
      strength: [0, [Validators.min(0)]],
      dexterity: [0, [Validators.min(0)]],
      constitution: [0, [Validators.min(0)]],
      intelligence: [0, [Validators.min(0)]],
      wisdom: [0, [Validators.min(0)]],
      inspiration: [0, [Validators.min(0)]],
    });

    this.characterId.set(this.route.snapshot.paramMap.get('id'));
    const id = this.characterId();
    if (!id) { this.router.navigate(['/table']); return; }

    this.store.characterSheet$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((s) => this.onSheetChanged(s));

    this.characterService.loadAllCharacters();

    this.form.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.form.dirty && this.form.valid),
        debounceTime(600),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      )
      .subscribe(() => this.save());
  }

  toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  // ── Realtime Merge ──────────────────────────────────────────────────

  private onSheetChanged(sheet: CharacterSheet | undefined): void {
    if (!sheet) return;
    this.sheet.set(sheet);

    if (!this.form.dirty) {
      this.patchFromCharacter(sheet.character);
      this.remoteChanged.set(false);
    } else {
      this.remoteChanged.set(true);
    }
  }

  private patchFromCharacter(char: Character): void {
    this.form.patchValue({
      name: char.name,
      race: char.race,
      biography: char.biography,
      notes: char.notes,
      hp: char.hp, hp_max: char.hp_max,
      magic: char.magic, magic_max: char.magic_max,
      mana: char.mana, mana_max: char.mana_max,
      xp: char.xp,
      strength: char.strength, dexterity: char.dexterity,
      constitution: char.constitution, intelligence: char.intelligence,
      wisdom: char.wisdom, inspiration: char.inspiration,
    }, { emitEvent: false });
    this.form.markAsPristine();
  }

  acceptRemoteChanges(): void {
    const s = this.sheet();
    if (s) this.patchFromCharacter(s.character);
  }

  // ── Save ─────────────────────────────────────────────────────────────

  private async save(): Promise<void> {
    const id = this.characterId();
    if (!id) return;

    const v = this.form.getRawValue() as CharForm;
    const changes: Partial<Character> = {
      name: v.name,
      race: v.race,
      biography: v.biography,
      notes: v.notes,
      hp: v.hp,
      hp_max: this.auth.isMaster() ? v.hp_max : undefined,
      magic: v.magic,
      magic_max: this.auth.isMaster() ? v.magic_max : undefined,
      mana: v.mana,
      mana_max: this.auth.isMaster() ? v.mana_max : undefined,
      xp: v.xp,
      strength: v.strength,
      dexterity: v.dexterity,
      constitution: v.constitution,
      intelligence: v.intelligence,
      wisdom: v.wisdom,
      inspiration: v.inspiration,
    };
    this.saving.set(true);
    try {
      await this.characterService.updateCharacter(id, changes);
      this.form.markAsPristine();
    } catch {} finally {
      this.saving.set(false);
    }
  }

  // ── Tab Helpers ─────────────────────────────────────────────────────

  get sheetData() { return this.sheet(); }
  get stats() { return STATS; }

  // ── Computed ────────────────────────────────────────────────────────

  statMod(value: number): string {
    const mod = Math.floor((value - 10) / 2);
    return mod >= 0 ? '+' + mod : String(mod);
  }

  hpPercent(): number {
    const c = this.sheet()?.character;
    if (!c || c.hp_max === 0) return 0;
    return Math.min(100, (c.hp / c.hp_max) * 100);
  }

  manaPercent(): number {
    const c = this.sheet()?.character;
    if (!c || c.mana_max === 0) return 0;
    return Math.min(100, (c.mana / c.mana_max) * 100);
  }

  // ── Equipment ───────────────────────────────────────────────────────

  getEquippedForSlot(slot: string): EquippedItem | undefined {
    return this.sheet()?.equipment.find((e) => e.slot === slot);
  }

  getItemName(itemId: string | null): string {
    if (!itemId) return '—';
    return this.sheet()?.items.find((i) => i.id === itemId)?.name ?? '—';
  }

  // ── CRUD Actions ────────────────────────────────────────────────────

  async addItem(name: string, desc: string, qty: number): Promise<void> {
    const id = this.characterId(); if (!id) return;
    await this.characterService.addItem({ character_id: id, name, description: desc, quantity: qty, effect: { type: 'custom', formula: '' } });
    this.showAddItem.set(false);
  }

  async updateItemQty(it: Item, d: number): Promise<void> {
    const q = Math.max(0, it.quantity + d);
    if (q === 0) await this.characterService.deleteItem(it.id, it.character_id);
    else await this.characterService.updateItem(it.id, { quantity: q });
  }

  async deleteItem(it: Item): Promise<void> { await this.characterService.deleteItem(it.id, it.character_id); }

  async equipToSlot(itemId: string, slot: EquipmentSlot): Promise<void> {
    const id = this.characterId(); if (!id) return;
    await this.characterService.equipItem(id, itemId, slot);
  }

  async unequipSlot(eq: EquippedItem): Promise<void> { await this.characterService.unequipItem(eq.id, eq.character_id); }

  async addSkill(name: string, bonus: number): Promise<void> {
    const id = this.characterId(); if (!id) return;
    await this.characterService.addSkill({ character_id: id, name, proficient: false, bonus });
    this.showAddSkill.set(false);
  }

  async toggleSkill(sk: Skill): Promise<void> { await this.characterService.updateSkill(sk.id, { proficient: !sk.proficient }); }
  async deleteSkill(sk: Skill): Promise<void> { await this.characterService.deleteSkill(sk.id, sk.character_id); }

  async addAbility(name: string, desc: string): Promise<void> {
    const id = this.characterId(); if (!id) return;
    await this.characterService.addAbility({ character_id: id, name, description: desc, effect: { type: 'custom', formula: '' } });
    this.showAddAbility.set(false);
  }

  async deleteAbility(a: Ability): Promise<void> { await this.characterService.deleteAbility(a.id, a.character_id); }

  async addSpell(name: string, desc: string, cost: number): Promise<void> {
    const id = this.characterId(); if (!id) return;
    await this.characterService.addSpell({ character_id: id, name, description: desc, mana_cost: cost, effect: { type: 'custom', formula: '' } });
    this.showAddSpell.set(false);
  }

  async deleteSpell(sp: Spell): Promise<void> { await this.characterService.deleteSpell(sp.id, sp.character_id); }

  async addBuff(name: string, desc: string, dur: number): Promise<void> {
    const id = this.characterId(); if (!id) return;
    await this.characterService.addBuff({
      character_id: id, name, description: desc,
      type: dur < 0 ? 'passive' : 'buff',
      effect: { type: 'custom', formula: '' },
      source: 'manual', duration: dur, expires_at: null,
    });
    this.showAddBuff.set(false);
  }

  async deleteBuff(b: Buff): Promise<void> { await this.characterService.deleteBuff(b.id, b.character_id); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
