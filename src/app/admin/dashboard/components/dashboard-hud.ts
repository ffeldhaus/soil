import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '@angular/fire/auth';

import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-dashboard-hud',
  standalone: true,
  imports: [LanguageSwitcherComponent],
  templateUrl: './dashboard-hud.html',
})
export class DashboardHudComponent {
  @Input() user: User | null = null;
  @Output() logout = new EventEmitter<void>();

  readonly photoURL = $localize`:@@user.photoURL:assets/images/ok.jpg`;
}
