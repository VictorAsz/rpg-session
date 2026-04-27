import { Injectable, Renderer2, RendererFactory2, inject, signal } from '@angular/core';

export type ThemeName = 'dark' | 'pastel' | 'midnight';

const THEME_STORAGE_KEY = 'rpg-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly renderer: Renderer2;

  readonly current = signal<ThemeName>('dark');
  readonly themes: { value: ThemeName; label: string; icon: string }[] = [
    { value: 'dark', label: 'Escuro', icon: '&#9790;' },
    { value: 'pastel', label: 'Pergaminho', icon: '&#9784;' },
    { value: 'midnight', label: 'Meia-Noite', icon: '&#9733;' },
  ];

  constructor(factory: RendererFactory2) {
    this.renderer = factory.createRenderer(null, null);
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
    if (saved === 'dark' || saved === 'pastel' || saved === 'midnight') {
      this.apply(saved);
    } else {
      this.apply('dark');
    }
  }

  set(theme: ThemeName): void {
    this.apply(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  private apply(theme: ThemeName): void {
    this.current.set(theme);
    this.renderer.setAttribute(document.documentElement, 'data-theme', theme);
  }
}
