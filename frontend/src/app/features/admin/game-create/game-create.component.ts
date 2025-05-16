// File: frontend/src/app/features/admin/game-create/game-create.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
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

import { environment } from '../../../../environments/environment';
import { AdminGameService } from '../../../core/services/admin-game.service';
import { GameCreateAdminPayload, GamePublic } from '../../../core/models/game.model'; // Changed GameDetailsView to GamePublic
import { NotificationService } from '../../../core/services/notification.service';

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
export class GameCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private adminGameService = inject(AdminGameService);
  private notificationService = inject(NotificationService);

  createGameForm!: FormGroup;
  isSubmitting = signal(false);

  defaultGameRounds = FALLBACK_GAME_ROUNDS;
  maxPlayersLimit = FALLBACK_MAX_PLAYERS;
  minPlayersRequired = FALLBACK_MIN_PLAYERS;
  defaultHumanPlayers = FALLBACK_HUMAN_PLAYERS;
  defaultAiPlayers = FALLBACK_AI_PLAYERS;
  defaultGameName = '';

  constructor() {
     if (!environment.production && environment.devDefaults?.game) {
        const devGame = environment.devDefaults.game;
        this.defaultGameName = devGame.name || '';
        this.defaultGameRounds = devGame.rounds || FALLBACK_GAME_ROUNDS;
        this.maxPlayersLimit = devGame.maxPlayers || FALLBACK_MAX_PLAYERS;
        this.defaultHumanPlayers = devGame.humanPlayers ?? FALLBACK_HUMAN_PLAYERS;
        this.defaultAiPlayers = devGame.aiPlayers ?? FALLBACK_AI_PLAYERS;
     }

    this.createGameForm = this.fb.group({
      name: [this.defaultGameName, [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      // Form control names are camelCase to match GameCreateAdminPayload model
      numberOfRounds: [this.defaultGameRounds, [Validators.required, Validators.min(5), Validators.max(50)]],
      maxPlayers: [this.maxPlayersLimit, [Validators.required, Validators.min(this.minPlayersRequired), Validators.max(10)]],
      requestedPlayerSlots: [this.defaultHumanPlayers, [Validators.required, Validators.min(0)]],
      aiPlayerCount: [this.defaultAiPlayers, [Validators.required, Validators.min(0)]]
    }, { validators: this.totalPlayerCountValidator.bind(this) });
  }

  ngOnInit(): void {
    this.setupDynamicValidators();
  }

  setupDynamicValidators(): void {
    this.createGameForm.get('maxPlayers')?.valueChanges.subscribe(max => {
      this.createGameForm.get('requestedPlayerSlots')?.setValidators([
        Validators.required, Validators.min(0), Validators.max(max)
      ]);
      this.createGameForm.get('requestedPlayerSlots')?.updateValueAndValidity();

      const currentHumans = this.createGameForm.get('requestedPlayerSlots')?.value || 0;
      this.createGameForm.get('aiPlayerCount')?.setValidators([
        Validators.required, Validators.min(0), Validators.max(max - currentHumans)
      ]);
      this.createGameForm.get('aiPlayerCount')?.updateValueAndValidity();
    });

    this.createGameForm.get('requestedPlayerSlots')?.valueChanges.subscribe(humans => {
        const max = this.createGameForm.get('maxPlayers')?.value || this.maxPlayersLimit;
        this.createGameForm.get('aiPlayerCount')?.setValidators([
            Validators.required, Validators.min(0), Validators.max(max - humans)
        ]);
        this.createGameForm.get('aiPlayerCount')?.updateValueAndValidity();
    });

    this.createGameForm.get('maxPlayers')?.updateValueAndValidity();
    this.createGameForm.get('requestedPlayerSlots')?.updateValueAndValidity();
  }

  totalPlayerCountValidator(group: AbstractControl): { [key: string]: any } | null {
    const human = group.get('requestedPlayerSlots')?.value ?? 0;
    const ai = group.get('aiPlayerCount')?.value ?? 0;
    const max = group.get('maxPlayers')?.value ?? this.maxPlayersLimit;
    const totalPlayers = human + ai;

    if (totalPlayers > max) {
      return { totalPlayersExceedMax: { requiredMax: max, actual: totalPlayers, message: `Total players (Human: ${human} + AI: ${ai} = ${totalPlayers}) cannot exceed Max Players set for game (${max}).` } };
    }
    if (totalPlayers < this.minPlayersRequired) {
      return { totalPlayersBelowMin: { requiredMin: this.minPlayersRequired, actual: totalPlayers, message: `A game must have at least ${this.minPlayersRequired} player(s) (Human or AI). Current total: ${totalPlayers}.`} };
    }
    return null;
  }

  onSubmit(): void {
    if (this.createGameForm.invalid) {
      this.notificationService.showError('Please correct the errors in the form.');
      this.createGameForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    // Form value directly maps to GameCreateAdminPayload due to matching camelCase names
    const gameData: GameCreateAdminPayload = this.createGameForm.value;

    this.adminGameService.createGame(gameData).subscribe({
      next: (createdGame: GamePublic) => { // Changed to GamePublic
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
