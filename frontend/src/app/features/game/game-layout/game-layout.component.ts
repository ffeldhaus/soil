// File: frontend/src/app/features/game/game-layout/game-layout.component.ts
import { Component, inject, signal, OnInit, computed, ViewChild } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AsyncPipe, NgFor, NgIf, CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenu, MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider'; 

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { IAuthService } from '../../../core/services/auth.service.interface';
import { NotificationService } from '../../../core/services/notification.service';
import { GamePublic } from '../../../core/models/game.model'; // Changed from GameDetailsView
import { IPlayerGameService } from '../../../core/services/player-game.service.interface'; 
import { AUTH_SERVICE_TOKEN } from '../../../core/services/injection-tokens';

interface GameNavItem {
  label: string;
  linkParts: any[];
  icon?: string;
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-game-layout',
  standalone: true,
  imports: [
    CommonModule, RouterModule, NgIf, AsyncPipe, NgFor,
    MatToolbarModule, MatButtonModule, MatIconModule,
    MatSidenavModule, MatListModule, MatTooltipModule,
    MatMenuModule, 
    MatDividerModule, 
  ],
  templateUrl: './game-layout.component.html',
  styleUrls: ['./game-layout.component.scss']
})
export class GameLayoutComponent implements OnInit {
  @ViewChild('drawer') drawer!: MatSidenav;
  @ViewChild('mobileMenu') mobileMenu!: MatMenu;

  private breakpointObserver = inject(BreakpointObserver);
  public authService: IAuthService = inject(AUTH_SERVICE_TOKEN); 
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notificationService = inject(NotificationService);

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  gameId = signal<string | null>(null);
  currentGame = signal<GamePublic | null>(null); // Changed from GameDetailsView
  
  gameNavItems = signal<GameNavItem[]>([]);

  playerDisplayName = computed(() => {
    const user = this.authService.currentUser();
    // Accessing camelCase properties from User model
    return user?.displayName || user?.username || `Player ${user?.playerNumber ?? ''}`;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('gameId');
      this.gameId.set(id);
      if (id) {
        this.updateNavItems(id);
        // TODO: Optionally load game details here if needed for the layout itself
        // this.loadGameDetails(id);
      }
    });
  }

  // Example: method to load game details if needed for the layout header
  // loadGameDetails(gameId: string): void {
  //   const playerGameService = inject(IPlayerGameService); // Or GameService if more appropriate
  //   playerGameService.getGameDetails(gameId).subscribe(details => this.currentGame.set(details));
  // }

  updateNavItems(gameId: string | null): void {
    if (!gameId) {
      this.gameNavItems.set([]);
      return;
    }
    this.gameNavItems.set([
      // The main game view is often the PlayerComponent itself, which handles tabs for rounds.
      // So direct links to field/results might be less common here, but depends on overall routing.
      { label: 'Game Board', linkParts: ['/game', gameId], icon: 'sports_esports' }, // Main player view
      // { label: 'Dashboard', linkParts: ['/game', gameId, 'dashboard'], icon: 'dashboard' }, // If separate dashboard exists
      // { label: 'Rules', linkParts: ['/game', gameId, 'rules'], icon: 'gavel' },
    ]);
  }

  async onLogout() {
    try {
      await this.authService.logout();
      // Navigate to login or home page after logout
      this.router.navigate(['/login']); 
    } catch (error) {
      console.error('Logout failed in game layout', error);
      this.notificationService.showError('Logout failed.');
    }
  }
}
