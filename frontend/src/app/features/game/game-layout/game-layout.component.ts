// File: frontend/src/app/features/game/game-layout/game-layout.component.ts
import { Component, inject, signal, OnInit, computed, ViewChild } from '@angular/core'; // Added ViewChild
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AsyncPipe, NgFor, NgIf, CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav'; // Added MatSidenav
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenu, MatMenuModule } from '@angular/material/menu'; // Import MatMenuModule and MatMenu
import { MatDividerModule } from '@angular/material/divider'; 

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { IAuthService } from '../../../core/services/auth.service.interface';
import { NotificationService } from '../../../core/services/notification.service';
import { GameDetailsView } from '../../../core/models/game.model';
import { IPlayerGameService } from '../../../core/services/player-game.service.interface'; 
import { FooterComponent } from '../../../shared/components/footer/footer.component';
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
    FooterComponent
  ],
  templateUrl: './game-layout.component.html',
  styleUrls: ['./game-layout.component.scss']
})
export class GameLayoutComponent implements OnInit {
  @ViewChild('drawer') drawer!: MatSidenav; // For <mat-sidenav #drawer>
  // If mobileMenu is a template reference variable like <mat-menu #mobileMenu="matMenu"> 
  // then you don't need a class property for it for matMenuTriggerFor to work.
  // If it's intended to be controlled from component logic, this is a placeholder:
  @ViewChild('mobileMenu') mobileMenu!: MatMenu; // Or the specific name of your menu template reference

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
  currentGame = signal<GameDetailsView | null>(null); 
  
  gameNavItems = signal<GameNavItem[]>([]);

  playerDisplayName = computed(() => {
    const user = this.authService.currentUser();
    return user?.displayName || `Player ${user?.playerNumber ?? ''}`;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('gameId');
      this.gameId.set(id);
      if (id) {
        this.updateNavItems(id);
      }
    });
  }

  updateNavItems(gameId: string | null): void {
    if (!gameId) {
      this.gameNavItems.set([]);
      return;
    }
    // Example nav items, adjust as per your actual game routes
    this.gameNavItems.set([
      { label: 'Dashboard', linkParts: ['/game', gameId, 'dashboard'], icon: 'dashboard' },
      { label: 'My Field', linkParts: ['/game', gameId, 'field'], icon: 'grass' },
      // { label: 'Market', linkParts: ['/game', gameId, 'market'], icon: 'storefront' },
      // { label: 'Results', linkParts: ['/game', gameId, 'results'], icon: 'leaderboard' },
    ]);
  }

  async onLogout() {
    try {
      await this.authService.logout();
    } catch (error) {
      console.error('Logout failed in game layout', error);
      this.notificationService.showError('Logout failed.');
    }
  }
}
