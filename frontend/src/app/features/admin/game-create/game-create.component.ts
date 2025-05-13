// File: frontend/src/app/features/admin/game-create/game-create.component.ts
import { Component, inject, signal, OnInit } from '@angular/core'; // Added OnInit
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { environment } from '../../../../environments/environment'; // Import environment
import { AdminGameService } from '../../../core/services/admin-game.service';
import { GameCreateAdminPayload, GameDetailsView } from '../../../core/models/game.model';
import { NotificationService } from '../../../core/services/notification.service';

// Constants for default values, ideally from a shared config or environment
// These can now potentially be overridden by dev defaults
const FALLBACK_GAME_ROUNDS = 15;
const FALLBACK_MAX_PLAYERS = 8;
const FALLBACK_MIN_PLAYERS = 1;
const FALLBACK_HUMAN_PLAYERS = 1;
const FALLBACK_AI_PLAYERS = 0;

@Component({
  selector: 'app-game-create',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSelectModule, MatIconModule, MatTooltipModule
  ],
  templateUrl: './game-create.component.html',
  styleUrls: ['./game-create.component.scss']
})
export class GameCreateComponent implements OnInit { // Implement OnInit
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private adminGameService = inject(AdminGameService);
  private notificationService = inject(NotificationService);

  createGameForm!: FormGroup;
  isSubmitting = signal(false);

  // Use fallback constants, potentially updated by dev defaults
  defaultGameRounds = FALLBACK_GAME_ROUNDS;
  maxPlayersLimit = FALLBACK_MAX_PLAYERS;
  minPlayersRequired = FALLBACK_MIN_PLAYERS;
  defaultHumanPlayers = FALLBACK_HUMAN_PLAYERS;
  defaultAiPlayers = FALLBACK_AI_PLAYERS;
  defaultGameName = '';


  constructor() {
     // Apply dev defaults if available
     if (!environment.production && environment.devDefaults?.game) {
        console.log('GameCreateComponent: Applying dev defaults');
        const devGame = environment.devDefaults.game;
        this.defaultGameName = devGame.name || '';
        this.defaultGameRounds = devGame.rounds || FALLBACK_GAME_ROUNDS;
        this.maxPlayersLimit = devGame.maxPlayers || FALLBACK_MAX_PLAYERS;
        this.defaultHumanPlayers = devGame.humanPlayers ?? FALLBACK_HUMAN_PLAYERS; // Use ?? for 0
        this.defaultAiPlayers = devGame.aiPlayers ?? FALLBACK_AI_PLAYERS; // Use ?? for 0
     }

    this.createGameForm = this.fb.group({
      name: [this.defaultGameName, [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      number_of_rounds: [this.defaultGameRounds, [Validators.required, Validators.min(5), Validators.max(50)]],
      // Use dev default maxPlayers if available, otherwise fallback
      max_players: [this.maxPlayersLimit, [Validators.required, Validators.min(this.minPlayersRequired), Validators.max(10)]],
      requested_player_slots: [this.defaultHumanPlayers, [Validators.required, Validators.min(0)]],
      ai_player_count: [this.defaultAiPlayers, [Validators.required, Validators.min(0)]]
    }, { validators: this.totalPlayerCountValidator.bind(this) }); // Bind 'this' for validator context
  }

  ngOnInit(): void {
    // Set initial dynamic validators based on potentially updated default values
    this.setupDynamicValidators();
  }

  setupDynamicValidators(): void {
     // Dynamically update max validators for human/AI slots based on max_players
    this.createGameForm.get('max_players')?.valueChanges.subscribe(max => {
      this.createGameForm.get('requested_player_slots')?.setValidators([
        Validators.required, Validators.min(0), Validators.max(max)
      ]);
      this.createGameForm.get('requested_player_slots')?.updateValueAndValidity();

      const currentHumans = this.createGameForm.get('requested_player_slots')?.value || 0;
      this.createGameForm.get('ai_player_count')?.setValidators([
        Validators.required, Validators.min(0), Validators.max(max - currentHumans)
      ]);
      this.createGameForm.get('ai_player_count')?.updateValueAndValidity();
    });

    this.createGameForm.get('requested_player_slots')?.valueChanges.subscribe(humans => {
        const max = this.createGameForm.get('max_players')?.value || this.maxPlayersLimit;
        this.createGameForm.get('ai_player_count')?.setValidators([
            Validators.required, Validators.min(0), Validators.max(max - humans)
        ]);
        this.createGameForm.get('ai_player_count')?.updateValueAndValidity();
    });

    // Trigger initial validation update for dynamic fields
    this.createGameForm.get('max_players')?.updateValueAndValidity();
    this.createGameForm.get('requested_player_slots')?.updateValueAndValidity();
  }

  totalPlayerCountValidator(group: AbstractControl): { [key: string]: any } | null {
    const human = group.get('requested_player_slots')?.value ?? 0;
    const ai = group.get('ai_player_count')?.value ?? 0;
    const max = group.get('max_players')?.value ?? this.maxPlayersLimit; // Use potentially updated maxPlayersLimit
    const totalPlayers = human + ai;

    if (totalPlayers > max) {
      return { totalPlayersExceedMax: { requiredMax: max, actual: totalPlayers, message: `Total players (Human: ${human} + AI: ${ai} = ${totalPlayers}) cannot exceed Max Players set for game (${max}).` } };
    }
    if (totalPlayers < this.minPlayersRequired) { // Use potentially updated minPlayersRequired
      return { totalPlayersBelowMin: { requiredMin: this.minPlayersRequired, actual: totalPlayers, message: `A game must have at least ${this.minPlayersRequired} player(s) (Human or AI). Current total: ${totalPlayers}.`} };
    }
    return null;
  }

  onSubmit(): void {
    if (this.createGameForm.invalid) {
      this.notificationService.showError('Please correct the errors in the form.');
      this.createGameForm.markAllAsTouched(); // Show errors on all fields
      return;
    }
    this.isSubmitting.set(true);

    const gameData: GameCreateAdminPayload = this.createGameForm.value;

    this.adminGameService.createGame(gameData).subscribe({
      next: (createdGame: GameDetailsView) => {
        this.notificationService.showSuccess(`Game "${createdGame.name}" created successfully! Player credentials will be sent to your email.`);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err: HttpErrorResponse | any) => {
        this.notificationService.showError(`Failed to create game: ${err.message || 'Unknown error'}`);
        this.isSubmitting.set(false);
      },
      complete: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/dashboard']);
  }
}
