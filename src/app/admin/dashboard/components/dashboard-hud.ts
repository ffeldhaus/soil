import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { User } from '@angular/fire/auth';
import { RouterLink } from '@angular/router';

import type { UserStatus } from '../../../types';

@Component({
  selector: 'app-dashboard-hud',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-hud.html',
})
export class DashboardHudComponent {
  @Input() user: User | null = null;
  @Input() userStatus: UserStatus | null = null;
  @Output() logout = new EventEmitter<void>();

  readonly photoURL = 'assets/images/gut.jpg';
}
