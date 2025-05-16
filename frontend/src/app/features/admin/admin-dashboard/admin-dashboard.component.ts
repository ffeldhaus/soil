// File: frontend/src/app/features/admin/admin-dashboard/admin-dashboard.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http'; 
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

import { AdminGameService } from '../../../core/services/admin-game.service'; 
import { GameAdminListItem, GamePublic } from '../../../core/models/game.model'; // Changed GameDetailsView to GamePublic
import { PlayerPublic } from '../../../core/models/player.model';
import { NotificationService } from '../../../core/services/notification.service';
import { IAuthService } from '../../../core/services/auth.service.interface';
import { AUTH_SERVICE_TOKEN } from '../../../core/services/injection-tokens';
import { AuthService } from '../../../core/services/auth.service';
import { MockAuthService } from '../../../core/services/auth.service.mock';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, TitleCasePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTableModule, MatTooltipModule, MatListModule, MatDividerModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  providers: [DatePipe]
})
export class AdminDashboardComponent implements OnInit {
  private adminGameService = inject(AdminGameService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private authService: IAuthService = inject(AUTH_SERVICE_TOKEN); 

  isLoading = signal(true);
  isLoadingDetails = signal(false); 
  adminGames = signal<GameAdminListItem[]>([]);
  selectedGameDetails = signal<GamePublic | null>(null); // Changed to GamePublic

  displayedColumns: string[] = ['name', 'status', 'currentRound', 'maxPlayers', 'actions'];

  ngOnInit(): void {
    this.loadAdminGames();
    // console.log('[AdminDashboard] AuthService instance:', this.authService);
    // if (this.authService instanceof MockAuthService) {
    //   console.log('[AdminDashboard] Detected MockAuthService instance.');
    // } else if (this.authService instanceof AuthService) {
    //   console.log('[AdminDashboard] Detected REAL AuthService instance.');
    // }
  }

  loadAdminGames(): void {
    this.isLoading.set(true);
    this.selectedGameDetails.set(null); 
    this.adminGameService.getAdminGames().subscribe({
      next: (games: GameAdminListItem[]) => { 
        this.adminGames.set(games);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse | any) => { 
        this.notificationService.showError('Failed to load games: ' + (err.message || 'Unknown error'));
        this.isLoading.set(false);
      }
    });
  }

  navigateToCreateGame(): void {
    this.router.navigate(['/admin/games/new']);
  }

  viewGameDetails(gameId: string): void {
    this.isLoadingDetails.set(true);
    this.selectedGameDetails.set(null); 
    this.adminGameService.getGameDetails(gameId).subscribe({
      next: (details: GamePublic) => { // Changed to GamePublic
        this.selectedGameDetails.set(details);
        this.isLoadingDetails.set(false);
      },
      error: (err: HttpErrorResponse | any) => {
        this.notificationService.showError(`Failed to load game details for ${gameId}: ` + (err.message || 'Unknown error'));
        this.isLoadingDetails.set(false);
      }
    });
  }

  closeGameDetails(): void {
    this.selectedGameDetails.set(null);
  }

  async impersonate(gameId: string, player: PlayerPublic): Promise<void> {
    const playerName = player.username || player.email || 'this player';
    if (confirm(`Are you sure you want to impersonate ${playerName} in game ${this.selectedGameDetails()?.name}?`)) {
      try {
        await this.authService.impersonatePlayer(gameId, player.uid);
        this.notificationService.showSuccess(`Now impersonating ${playerName}.`);
      } catch (error: any) {
        this.notificationService.showError("Impersonation failed: " + (error.message || 'Unknown error'));
      }
    }
  }

  advanceRound(gameId: string, gameName: string): void {
    const game = this.adminGames().find(g => g.id === gameId) || this.selectedGameDetails();
    if (!game) return;

    // Use camelCase property for gameStatus from GameAdminListItem or GamePublic
    const actionText = game.gameStatus === 'pending' && game.currentRoundNumber === 0 ? 'Start Game' : 'Advance Round';

    if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} for "${gameName}"?`)) {
      return;
    }

    this.isLoading.set(true); 
    this.adminGameService.advanceGameRound(gameId).subscribe({
      next: (updatedGame: GamePublic) => { // Changed to GamePublic
        // Use camelCase properties from updatedGame
        this.notificationService.showSuccess(`Game '${gameName}' state updated. New round: ${updatedGame.currentRoundNumber}. Status: ${updatedGame.gameStatus}`);
        this.loadAdminGames(); 
        if (this.selectedGameDetails() && this.selectedGameDetails()?.id === gameId) {
          this.viewGameDetails(gameId); 
        }
      },
      error: (err: HttpErrorResponse | any) => { 
        this.notificationService.showError(`Failed to ${actionText.toLowerCase()} for game '${gameName}': ${err.message || 'Unknown error'}`);
        this.isLoading.set(false);
      },
      complete: () => {
        if (this.isLoading()) this.isLoading.set(false);
      }
    });
  }

  confirmDeleteGame(gameId: string, gameName: string): void {
    if (confirm(`Are you sure you want to delete the game "${gameName}"? This action CANNOT be undone and will delete all associated player data.`)) {
      this.deleteGame(gameId, gameName);
    }
  }

  private deleteGame(gameId: string, gameName: string): void {
    this.isLoading.set(true);
    this.adminGameService.deleteGame(gameId).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Game "${gameName}" deleted successfully.`);
        this.loadAdminGames(); 
      },
      error: (err: HttpErrorResponse | any) => { 
        this.notificationService.showError(`Failed to delete game "${gameName}": ${err.message || 'Unknown error'}`);
        this.isLoading.set(false);
      }
    });
  }
}
