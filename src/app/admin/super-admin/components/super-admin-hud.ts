import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { User } from 'firebase/auth';

@Component({
  selector: 'app-super-admin-hud',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './super-admin-hud.html',
})
export class SuperAdminHudComponent {
  @Input() user: User | null = null;
  @Output() logout = new EventEmitter<void>();

  getInitials(user: User): string {
    const raw = (user.displayName || user.email || 'SA').trim();
    if (!raw) return 'SA';
    const parts = raw.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return raw.slice(0, 2).toUpperCase();
  }

  t(key: string): string {
    const translations: Record<string, string> = {
      'superadmin.title': 'System-Administrator',
      'superadmin.badge': 'System',
      'superadmin.logout': 'Abmelden',
    };
    return translations[key] || key;
  }
}
