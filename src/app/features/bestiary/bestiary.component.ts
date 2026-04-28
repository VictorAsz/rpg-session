import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsyncPipe } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AppSidebarComponent } from '../../shared/components/app-sidebar/app-sidebar.component';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { CreatureService } from '../../domain/bestiary/services/creature.service';
import { CreatureStore } from '../../domain/bestiary/services/creature.store';
import { CatalogStore } from '../../domain/compendium/services/catalog.store';
import { CatalogService } from '../../domain/compendium/services/catalog.service';
import type { Creature, CreatureAbility } from '../../shared/models/bestiary-models';
import type { CreatureRarity, CreatureClassification, CreatureBiome, CreatureDiet, CreatureBehavior, IntelligenceLevel } from '../../shared/models/bestiary-types';
import {
  RARITY_LABELS, RARITY_COLORS, CLASSIFICATION_LABELS, BIOME_LABELS,
  DIET_LABELS, BEHAVIOR_LABELS, INTELLIGENCE_LABELS, DAMAGE_TYPES, STATUS_EFFECTS,
} from '../../shared/models/bestiary-types';

type FormSection = 'basic' | 'combat' | 'ecology' | 'abilities';

@Component({
  selector: 'app-bestiary',
  imports: [ReactiveFormsModule, AsyncPipe, AppSidebarComponent],
  templateUrl: './bestiary.component.html',
  styleUrls: ['./bestiary.component.scss'],
})
export class BestiaryComponent implements OnDestroy {
  readonly auth = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  private readonly realtime = inject(RealtimeService);
  readonly creatureService = inject(CreatureService);
  readonly creatureStore = inject(CreatureStore);
  readonly catalogStore = inject(CatalogStore);
  readonly catalogService = inject(CatalogService);
  private readonly fb = inject(FormBuilder);

  // ── View state ──────────────────────────────────────────────────────
  readonly showForm = signal(false);
  readonly sidebarOpen = signal(true);
  toggleSidebar(): void { this.sidebarOpen.set(!this.sidebarOpen()); }
  readonly editingId = signal<string | null>(null);
  readonly activeSection = signal<FormSection>('basic');
  readonly quickView = signal<Creature | null>(null);
  readonly search = signal('');
  readonly filterRarity = signal<CreatureRarity | 'all'>('all');
  readonly filterClass = signal<CreatureClassification | 'all'>('all');
  readonly filterPublic = signal<'all' | 'public' | 'private'>('all');
  readonly addingAbility = signal(false);
  readonly creatureAbilities = signal<CreatureAbility[]>([]);

  // ── Constants ───────────────────────────────────────────────────────
  readonly rarities = Object.keys(RARITY_LABELS) as CreatureRarity[];
  readonly classifications = Object.keys(CLASSIFICATION_LABELS) as CreatureClassification[];
  readonly biomes = Object.keys(BIOME_LABELS) as CreatureBiome[];
  readonly diets = Object.keys(DIET_LABELS) as CreatureDiet[];
  readonly behaviors = Object.keys(BEHAVIOR_LABELS) as CreatureBehavior[];
  readonly intLevels = Object.keys(INTELLIGENCE_LABELS) as IntelligenceLevel[];
  readonly damageTypes = DAMAGE_TYPES;
  readonly statusEffects = STATUS_EFFECTS;
  readonly RARITY_LABELS = RARITY_LABELS;
  readonly RARITY_COLORS = RARITY_COLORS;
  readonly CLASSIFICATION_LABELS = CLASSIFICATION_LABELS;
  readonly BIOME_LABELS = BIOME_LABELS;
  readonly DIET_LABELS = DIET_LABELS;
  readonly BEHAVIOR_LABELS = BEHAVIOR_LABELS;
  readonly INTELLIGENCE_LABELS = INTELLIGENCE_LABELS;

  readonly formSections: { key: FormSection; label: string }[] = [
    { key: 'basic', label: 'Básico' },
    { key: 'combat', label: 'Combate' },
    { key: 'ecology', label: 'Ecologia' },
    { key: 'abilities', label: 'Habilidades' },
  ];

  // ── Reactive creatures list ─────────────────────────────────────────
  readonly creatures = signal<Creature[]>([]);

  // ── Filtered creatures ──────────────────────────────────────────────
  readonly filteredCreatures = computed(() => {
    let list = this.creatures();
    const s = this.search().toLowerCase();
    const r = this.filterRarity();
    const c = this.filterClass();
    const p = this.filterPublic();

    if (s) list = list.filter(x => x.name.toLowerCase().includes(s) || x.short_description.toLowerCase().includes(s));
    if (r !== 'all') list = list.filter(x => x.rarity === r);
    if (c !== 'all') list = list.filter(x => x.classification === c);
    if (p === 'public') list = list.filter(x => x.is_public);
    if (p === 'private') list = list.filter(x => !x.is_public);

    return list;
  });

  // ── Form ────────────────────────────────────────────────────────────
  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    short_description: [''],
    level: [1],
    rarity: ['common' as CreatureRarity],
    is_public: [true],
    is_playable: [false],
    image: [''],
    token_image: [''],
    species: [''],
    classification: ['beast' as CreatureClassification],
    habitat: [''],
    region: [''],
    biome: ['forest' as CreatureBiome],
    diet: ['omnivore' as CreatureDiet],
    behavior: ['social' as CreatureBehavior],
    intelligence_level: ['medium' as IntelligenceLevel],
    language: [''],
    lifespan: [''],
    reproduction: [''],
    growth_stages: [''],
    hp: [0],
    mana: [0],
    armor: [0],
    speed: [0],
    initiative: [0],
    strength: [10],
    dexterity: [10],
    constitution: [10],
    intelligence: [10],
    wisdom: [10],
    skills: [''],
    resistances: [''],
    weaknesses: [''],
    immunities: [''],
    damage_types: [''],
    loot_table: [''],
  });

  constructor() {
    this.creatureStore.creatures$
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => this.creatures.set(list));

    this.realtime.connect('bestiary');
    this.creatureService.loadAll();
    this.creatureService.subscribeToRealtime();
    this.catalogService.loadCatalog();
    this.catalogService.subscribeToRealtime();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Actions ─────────────────────────────────────────────────────────
  async openForm(creature?: Creature): Promise<void> {
    this.editingId.set(creature?.id ?? null);
    if (creature) {
      this.form.patchValue({
        ...creature,
        growth_stages: (creature.growth_stages ?? []).join(', '),
        skills: (creature.skills ?? []).join(', '),
        resistances: (creature.resistances ?? []).join(', '),
        weaknesses: (creature.weaknesses ?? []).join(', '),
        immunities: (creature.immunities ?? []).join(', '),
        damage_types: (creature.damage_types ?? []).join(', '),
        loot_table: (creature.loot_table ?? []).join(', '),
      });
      await this.creatureService.loadAbilities(creature.id);
      this.creatureAbilities.set(this.creatureStore.snapshot.abilities[creature.id] ?? []);
    } else {
      this.form.reset({
        level: 1, rarity: 'common', is_public: true, is_playable: false,
        classification: 'beast', biome: 'forest', diet: 'omnivore',
        behavior: 'social', intelligence_level: 'medium',
        strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10,
      });
      this.creatureAbilities.set([]);
    }
    this.activeSection.set('basic');
    this.showForm.set(true);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const split = (s: string | null | undefined) => (s ?? '').split(/,\s*/).map(x => x.trim()).filter(Boolean);

    const data: Partial<Creature> = {
      name: v.name!, description: v.description ?? '', short_description: v.short_description ?? '',
      level: v.level ?? 1, rarity: v.rarity as CreatureRarity,
      is_public: v.is_public ?? true, is_playable: v.is_playable ?? false,
      image: v.image ?? '', token_image: v.token_image ?? '',
      species: v.species ?? '', classification: v.classification as CreatureClassification,
      habitat: v.habitat ?? '', region: v.region ?? '', biome: v.biome as CreatureBiome,
      diet: v.diet as CreatureDiet, behavior: v.behavior as CreatureBehavior,
      intelligence_level: v.intelligence_level as IntelligenceLevel,
      language: v.language ?? '', lifespan: v.lifespan ?? '', reproduction: v.reproduction ?? '',
      growth_stages: split(v.growth_stages),
      hp: v.hp ?? 0, mana: v.mana ?? 0, armor: v.armor ?? 0,
      speed: v.speed ?? 0, initiative: v.initiative ?? 0,
      strength: v.strength ?? 10, dexterity: v.dexterity ?? 10,
      constitution: v.constitution ?? 10, intelligence: v.intelligence ?? 10, wisdom: v.wisdom ?? 10,
      skills: split(v.skills), resistances: split(v.resistances),
      weaknesses: split(v.weaknesses), immunities: split(v.immunities),
      damage_types: split(v.damage_types), loot_table: split(v.loot_table),
    };

    const id = this.editingId();
    if (id) await this.creatureService.update(id, data);
    else await this.creatureService.create(data);
    this.showForm.set(false);
  }

  async deleteCreature(c: Creature): Promise<void> {
    if (confirm(`Remover ${c.name}?`)) await this.creatureService.delete(c.id);
  }

  async addAbility(abilityId: string, slotType: string): Promise<void> {
    const cid = this.editingId();
    if (!cid || !abilityId) return;
    const source = this.catalogStore.snapshot.spells.find(s => s.id === abilityId) ? 'spell' : 'ability';
    await this.creatureService.addAbility(cid, abilityId, slotType as 'active' | 'passive', source);
    this.creatureAbilities.set(this.creatureStore.snapshot.abilities[cid] ?? []);
  }

  async removeAbility(id: string): Promise<void> {
    const cid = this.editingId();
    if (!cid) return;
    await this.creatureService.removeAbility(id, cid);
    this.creatureAbilities.set(this.creatureStore.snapshot.abilities[cid] ?? []);
  }

  getAbilityName(ca: CreatureAbility): string {
    if (ca.spell_id) return this.catalogStore.snapshot.spells.find(s => s.id === ca.spell_id)?.name ?? ca.spell_id.slice(0, 8);
    return this.catalogStore.snapshot.abilities.find(a => a.id === ca.ability_id)?.name ?? ca.ability_id?.slice(0, 8) ?? '—';
  }

  displayImage(creature: Creature): string {
    return creature.image || 'assets/creature-placeholder.svg';
  }

  toggleQuickView(c: Creature | null): void {
    this.quickView.set(this.quickView()?.id === c?.id ? null : c);
  }
}
