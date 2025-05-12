// File: frontend/src/app/features/admin/admin-dashboard/admin-dashboard.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http'; // Import HttpErrorResponse
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
// MatDialog for confirmation is deferred for simplicity now.
// import { MatDialog } from '@angular/material/dialog';
// import { ConfirmationDialogComponent } from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';


import { AdminGameService } from '../../../core/services/admin-game.service'; // Corrected path
import { GameAdminListItem, GameDetailsView } from '../../../core/models/game.model'; // Assuming this path is correct now, if model exists
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, TitleCasePipe,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    MatTableModule, MatTooltipModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  providers: [DatePipe]
})
export class AdminDashboardComponent implements OnInit {
  private adminGameService = inject(AdminGameService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  // public dialog = inject(MatDialog);

  isLoading = signal(true);
  adminGames = signal<GameAdminListItem[]>([]);

  displayedColumns: string[] = ['name', 'status', 'currentRound', 'maxPlayers', 'actions'];

  ngOnInit(): void {
    this.loadAdminGames();
  }

  loadAdminGames(): void {
    this.isLoading.set(true);
    // Add type for 'games' and 'err'
    this.adminGameService.getAdminGames().subscribe({
      next: (games: GameAdminListItem[]) => { // Added type
        this.adminGames.set(games);
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse | any) => { // Added type
        this.notificationService.showError('Failed to load games: ' + (err.message || 'Unknown error'));
        this.isLoading.set(false);
      }
    });
  }

  navigateToCreateGame(): void {
    this.router.navigate(['/admin/games/new']);
  }

  viewGameDetails(gameId: string): void {
    // Placeholder: Navigation to a detailed game management view would go here
    // this.router.navigate(['/admin/games', gameId, 'manage']);
    this.notificationService.showInfo(`Game details view for ${gameId} is not yet implemented.`);
  }

  advanceRound(gameId: string, gameName: string): void {
    const game = this.adminGames().find(g => g.id === gameId);
    if (!game) return;

    const actionText = game.game_status === 'pending' && game.current_round_number === 0 ? 'Start Game' : 'Advance Round';

    if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} for "${gameName}"?`)) {
      return;
    }

    this.isLoading.set(true);
    // Add type for 'updatedGame' and 'err'
    this.adminGameService.advanceGameRound(gameId).subscribe({
      next: (updatedGame: GameDetailsView) => { // Added type
        this.notificationService.showSuccess(`Game '${gameName}' state updated. New round: ${updatedGame.current_round_number}. Status: ${updatedGame.game_status}`);
        this.loadAdminGames(); // Refresh list
      },
      error: (err: HttpErrorResponse | any) => { // Added type
        this.notificationService.showError(`Failed to ${actionText.toLowerCase()} for game '${gameName}': ${err.message || 'Unknown error'}`);
        this.isLoading.set(false);
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
    // Add type for 'err'
    this.adminGameService.deleteGame(gameId).subscribe({
      next: () => {
        this.notificationService.showSuccess(`Game "${gameName}" deleted successfully.`);
        this.loadAdminGames(); // Refresh list
      },
      error: (err: HttpErrorResponse | any) => { // Added type
        this.notificationService.showError(`Failed to delete game "${gameName}": ${err.message || 'Unknown error'}`);
        this.isLoading.set(false);
      }
    });
  }
}
