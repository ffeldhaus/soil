import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { User } from '@angular/fire/auth';

import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-super-admin-hud',
  standalone: true,
  imports: [LanguageSwitcherComponent],
  templateUrl: './super-admin-hud.html',
})
export class SuperAdminHudComponent {
  @Input() user: User | null = null;
  @Output() logout = new EventEmitter<void>();

  t(key: string): string {
    const translations: Record<string, string> = {
      'superadmin.title': $localize`:@@superadmin.title:System-Administrator`,
      'user.photoURL': $localize`:@@user.photoURL:assets/images/ok.jpg`,
      'superadmin.badge': $localize`:@@superadmin.badge:System`,
      'superadmin.logout': $localize`:@@superadmin.logout:Abmelden`,
    };
    return translations[key] || key;
  }
}
