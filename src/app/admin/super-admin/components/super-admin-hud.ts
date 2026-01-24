import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { User } from '@angular/fire/auth';

@Component({
  selector: 'app-super-admin-hud',
  standalone: true,
  templateUrl: './super-admin-hud.html',
})
export class SuperAdminHudComponent {
  @Input() user: User | null = null;
  @Output() logout = new EventEmitter<void>();

  t(key: string): string {
    const translations: Record<string, string> = {
      'superadmin.title': 'System-Administrator',
      'user.photoURL': 'assets/images/gut.jpg',
      'superadmin.badge': 'System',
      'superadmin.logout': 'Abmelden',
    };
    return translations[key] || key;
  }
}
