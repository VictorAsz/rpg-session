import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { CharacterService } from '../../domain/character/services/character.service';
import { CharacterStore } from '../../domain/character/services/character.store';
import { CatalogService } from '../../domain/compendium/services/catalog.service';
import { CatalogStore } from '../../domain/compendium/services/catalog.store';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import type { CharacterSheet } from '../../shared/models/character-state.model';
import type {
  Character, Skill, Item, EquippedItem, Ability, Spell, Buff, EquipmentSlot, ItemCatalog,
} from '../../shared/models/rpg-models';

const STATS = [
  { key: 'strength' as const, label: 'Força' },
  { key: 'dexterity' as const, label: 'Destreza' },
  { key: 'constitution' as const, label: 'Constituição' },
  { key: 'intelligence' as const, label: 'Inteligência' },
  { key: 'wisdom' as const, label: 'Sabedoria' },
];

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
  readonly catalogService = inject(CatalogService);
  readonly catalogStore = inject(CatalogStore);
  private readonly destroy$ = new Subject<void>();

  readonly sidebarOpen = signal(true);
  readonly editMode = signal(false);
  readonly bottomTab = signal<'skills' | 'inventory' | 'abilities' | 'spells'>('inventory');
  readonly bottomTabs: { key: 'skills' | 'inventory' | 'abilities' | 'spells'; label: string }[] = [
    { key: 'inventory', label: 'Inventário' },
    { key: 'skills', label: 'Perícias' },
    { key: 'abilities', label: 'Habilidades' },
    { key: 'spells', label: 'Magias' },
  ];
  readonly remoteChanged = signal(false);
  readonly saving = signal(false);

  // Add modals
  readonly showAddModal = signal<'item' | 'skill' | 'ability' | 'spell' | null>(null);
  readonly showAddBuff = signal(false);
  readonly imagePreview = signal<string | null>(null);
  readonly showImageInput = signal(false);

  editImage(): void { this.showImageInput.set(true); }

  async saveImageUrl(url: string): Promise<void> {
    const id = this.characterId(); if (!id) return;
    this.form.controls['photo_url'].setValue(url);
    this.imagePreview.set(url || null);
    this.showImageInput.set(false);
    await this.characterService.updateCharacter(id, { photo_url: url } as Partial<Character>);
  }
  readonly addForm = this.fb.group({
    name: ['', Validators.required],
    detail: [''],
    extra: [0],
  });

  readonly form: FormGroup;
  readonly characterId = signal<string | null>(null);
  readonly sheet = signal<CharacterSheet | null>(null);

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required]], race: [''],
      photo_url: [''],
      notes: [''],
      hp: [0, [Validators.min(0)]], hp_max: [0, [Validators.min(0)]],
      mana: [0, [Validators.min(0)]], mana_max: [0, [Validators.min(0)]],
      xp: [0, [Validators.min(0)]],
      strength: [0, [Validators.min(0)]], dexterity: [0, [Validators.min(0)]],
      constitution: [0, [Validators.min(0)]], intelligence: [0, [Validators.min(0)]],
      wisdom: [0, [Validators.min(0)]],
    });

    this.characterId.set(this.route.snapshot.paramMap.get('id'));
    const id = this.characterId();
    if (!id) { this.router.navigate(['/table']); return; }

    this.store.characterSheet$(id).pipe(takeUntil(this.destroy$)).subscribe(s => this.onSheetChanged(s));
    // Fallback: populate form from characters list before sheet data loads
    this.store.characters$.pipe(takeUntil(this.destroy$)).subscribe(chars => {
      const char = chars.find(c => c.id === id);
      if (char && !this.sheet()) {
        this.patchFromCharacter(char);
      }
    });
    this.characterService.loadAllCharacters();
    this.catalogService.loadCatalog();

    this.form.valueChanges.pipe(
      takeUntil(this.destroy$),
      filter(() => this.form.dirty && this.form.valid),
      debounceTime(600),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    ).subscribe(() => this.save());
  }

  // ── Realtime Merge ──────────────────────────────────────────────────

  private onSheetChanged(sheet: CharacterSheet | undefined): void {
    if (!sheet) return;
    this.sheet.set(sheet);
    if (!this.form.dirty) { this.patchFromCharacter(sheet.character); this.remoteChanged.set(false); }
    else { this.remoteChanged.set(true); }
  }

  private patchFromCharacter(char: Character): void {
    this.form.patchValue({
      name: char.name, race: char.race, photo_url: char.photo_url ?? '', notes: char.notes,
      hp: char.hp, hp_max: char.hp_max, mana: char.mana, mana_max: char.mana_max, xp: char.xp,
      strength: char.strength, dexterity: char.dexterity,
      constitution: char.constitution, intelligence: char.intelligence, wisdom: char.wisdom,
    }, { emitEvent: false });
    this.imagePreview.set(char.photo_url || null);
    this.form.markAsPristine();
  }

  acceptRemoteChanges(): void { const s = this.sheet(); if (s) this.patchFromCharacter(s.character); }

  // ── Save ─────────────────────────────────────────────────────────────

  private async save(): Promise<void> {
    const id = this.characterId(); if (!id) return;
    const v = this.form.getRawValue();
    const changes: Partial<Character> = { name: v.name, race: v.race, photo_url: v.photo_url, notes: v.notes, hp: v.hp, mana: v.mana, xp: v.xp };
    if (this.auth.isMaster()) {
      Object.assign(changes, { hp_max: v.hp_max, mana_max: v.mana_max, strength: v.strength, dexterity: v.dexterity, constitution: v.constitution, intelligence: v.intelligence, wisdom: v.wisdom });
    }
    this.saving.set(true);
    try { await this.characterService.updateCharacter(id, changes); this.form.markAsPristine(); }
    catch {} finally { this.saving.set(false); }
  }

  // ── Edit mode ───────────────────────────────────────────────────────

  toggleEdit(): void { this.editMode.set(!this.editMode()); }

  // ── Helpers ─────────────────────────────────────────────────────────

  get sheetData() { return this.sheet(); }
  get stats() { return STATS; }
  toggleSidebar(): void { this.sidebarOpen.set(!this.sidebarOpen()); }

  statMod(value: number): string { const m = Math.floor((value - 10) / 2); return m >= 0 ? '+' + m : String(m); }
  hpPercent(): number { const c = this.sheet()?.character; return c && c.hp_max ? Math.min(100, (c.hp / c.hp_max) * 100) : 0; }
  manaPercent(): number { const c = this.sheet()?.character; return c && c.mana_max ? Math.min(100, (c.mana / c.mana_max) * 100) : 0; }

  // ── Equipment ───────────────────────────────────────────────────────

  getEquippedForSlot(slot: EquipmentSlot): EquippedItem | undefined { return this.sheet()?.equipment.find(e => e.slot === slot); }
  getItemName(itemId: string | null): string { if (!itemId) return '—'; return this.sheet()?.items.find(i => i.id === itemId)?.name ?? '—'; }

  // ── Add Modal ───────────────────────────────────────────────────────

  openAddModal(type: 'item' | 'skill' | 'ability' | 'spell'): void {
    this.showAddModal.set(type);
    this.addForm.reset({ name: '', detail: '', extra: type === 'item' ? 1 : 0 });
    this.selectedCatalogItem.set(null);
  }

  closeAddModal(): void { this.showAddModal.set(null); }

  async saveAddModal(): Promise<void> {
    const id = this.characterId(); if (!id) return;
    const type = this.showAddModal();
    const v = this.addForm.getRawValue();

    if (type === 'item') {
      await this.characterService.addItem({
        character_id: id, name: v.name!, description: v.detail ?? '',
        quantity: v.extra ?? 1, effect: { type: 'custom', formula: '' },
      });
    } else if (type === 'skill') {
      await this.characterService.addSkill({ character_id: id, name: v.name!, proficient: false, bonus: v.extra ?? 0 });
    } else if (type === 'ability') {
      await this.characterService.addAbility({ character_id: id, name: v.name!, description: v.detail ?? '', effect: { type: 'custom', formula: '' } });
    } else if (type === 'spell') {
      await this.characterService.addSpell({ character_id: id, name: v.name!, description: v.detail ?? '', mana_cost: v.extra ?? 0, effect: { type: 'custom', formula: '' } });
    }
    this.closeAddModal();
  }

  // Catalog item selector
  readonly selectedCatalogItem = signal<string | null>(null);

  selectCatalogItem(itemId: string): void {
    this.selectedCatalogItem.set(itemId === this.selectedCatalogItem() ? null : itemId);
    if (itemId) {
      const cat = this.catalogStore.snapshot.items.find(i => i.id === itemId);
      if (cat) {
        this.addForm.patchValue({ name: cat.name, detail: cat.description, extra: 1 });
      }
    } else {
      this.addForm.reset({ name: '', detail: '', extra: 1 });
    }
  }

  // ── CRUD Actions ────────────────────────────────────────────────────

  async updateItemQty(it: Item, d: number): Promise<void> {
    const q = Math.max(0, it.quantity + d);
    if (q === 0) await this.characterService.deleteItem(it.id, it.character_id);
    else await this.characterService.updateItem(it.id, { quantity: q });
  }
  async deleteItem(it: Item): Promise<void> { await this.characterService.deleteItem(it.id, it.character_id); }
  async toggleSkill(sk: Skill): Promise<void> { await this.characterService.updateSkill(sk.id, { proficient: !sk.proficient }); }
  async deleteSkill(sk: Skill): Promise<void> { await this.characterService.deleteSkill(sk.id, sk.character_id); }
  async deleteAbility(a: Ability): Promise<void> { await this.characterService.deleteAbility(a.id, a.character_id); }
  async deleteSpell(sp: Spell): Promise<void> { await this.characterService.deleteSpell(sp.id, sp.character_id); }

  async addBuff(name: string, desc: string, dur: number): Promise<void> {
    const id = this.characterId(); if (!id) return;
    await this.characterService.addBuff({ character_id: id, name, description: desc, type: dur < 0 ? 'passive' : 'buff', effect: { type: 'custom', formula: '' }, source: 'manual', duration: dur, expires_at: null });
  }
  async deleteBuff(b: Buff): Promise<void> { await this.characterService.deleteBuff(b.id, b.character_id); }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
}
