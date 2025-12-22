import { Component, OnInit, HostListener, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../services/language.service';
import { GameService } from '../game.service';
import { Parcel as ParcelType, CropType, Round } from '../../types';
import { AuthService } from '../../auth/auth.service';
import { PlantingModal } from '../planting-modal/planting-modal';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { firstValueFrom, combineLatest, take } from 'rxjs';
import { User } from 'firebase/auth';
import { Parcel } from '../parcel/parcel';

import { RoundSettingsModal, RoundSettings } from '../round-settings-modal/round-settings-modal';
import { RoundResultModal } from '../round-result-modal/round-result-modal';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';
import { Finance } from '../finance/finance';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, Parcel, PlantingModal, RoundSettingsModal, RoundResultModal, RouterLink, FormsModule, LanguageSwitcherComponent, Finance],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  private gameService = inject(GameService);
  gameServicePublic = this.gameService; // Expose for template if needed, or just specific streams
  gameState$ = this.gameService.state$;

  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  parcels: ParcelType[] = []; // populated via subscription
  selectedIndices: Set<number> = new Set(); // Selection
  isDragging = false;
  selectionStart: number | null = null;
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  protected languageService = inject(LanguageService);
  user$ = this.authService.user$;

  showPlantingModal = false;
  showRoundSettingsModal = false;
  showMenu = false;
  showSettings = false;
  showFinance = false;
  newName = '';

  currentRoundSettings: RoundSettings = {
    machines: 0,
    organic: false,
    fertilizer: false,
    pesticide: false,
    organisms: false
  };

  availableCrops: CropType[] = ['Wheat', 'Corn', 'Potato', 'Beet', 'Barley', 'Oat', 'Rye', 'Fieldbean', 'Grass', 'Fallow'];

  isReadOnly = false;
  showReadOnlyBanner = false;
  isPlayer = false;
  viewingRound = 0;
  maxRoundNumber = 0;
  history: Round[] = [];
  isSubmitted = false;
  showRoundResultModal = false;
  roundResultRound: Round | null = null;

  showNutritionOverlay = false;
  showHarvestOverlay = false;
  showSoilOverlay = false;
  showMobileMenu = false;
  playerLabel = 'Player';
  playerNumber: string | undefined;

  // Game End Logic
  showGameEndModal = false;
  financialWinner: { name: string, capital: number } | null = null;
  soilWinner: { name: string, avgSoil: number } | null = null;

  // Inline Name Editing
  isEditingName = false;
  tempName = '';

  ngOnInit() {
    combineLatest([this.route.queryParams, this.user$]).subscribe(async ([params, user]: [any, User | null]) => {
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        const claims = idTokenResult.claims;
        const isImpersonating = localStorage.getItem('soil_admin_impersonating') === 'true';

        // Extract Game ID
        let activeGameId = params['gameId'] || (claims['gameId'] as string);
        if (!activeGameId && user.uid.startsWith('player-')) {
          const parts = user.uid.split('-');
          if (parts.length >= 3) {
            activeGameId = parts[1];
          }
        }

        if (activeGameId) {
          this.gameId = activeGameId;
          const gameState = await this.gameService.loadGame(activeGameId);
          if (gameState) {
            this.gameService.state$.subscribe(state => {
              if (state && state.game) {
                this.maxRoundNumber = state.game.currentRoundNumber;
                this.viewingRound = this.maxRoundNumber;
                this.playerLabel = state.game.settings?.playerLabel || 'Player';
                this.playerNumber = state.playerState?.playerNumber;

                // Detect Game Finished
                if (state.game.status === 'finished' && !this.showGameEndModal) {
                  this.calculateWinners(state.game);
                  this.showGameEndModal = true;
                }
              }
            });

            this.gameService.getParcels().subscribe(parcels => {
              if (this.viewingRound === this.maxRoundNumber) {
                this.parcels = parcels;
                this.checkOrientation();
              }
            });
            this.history = gameState.playerState?.history || [];
            this.isSubmitted = gameState.playerState?.submittedRound === this.viewingRound;
            this.updateReadOnly();
          }
        }

        if (claims['role'] === 'player' || user.uid.startsWith('player-') || isImpersonating) {
          this.isPlayer = true;
          if (isImpersonating) {
            this.isReadOnly = true;
            this.showReadOnlyBanner = true;
            setTimeout(() => {
              this.showReadOnlyBanner = false;
            }, 3000);
          }
        } else {
          if (claims['role'] !== 'player' && !user.uid.startsWith('player-')) {
            this.router.navigate(['/admin']);
          }
        }
      }
    });

    this.checkOrientation();
  }

  login() {
    // If on board and not logged in, we might want to just go to admin to login?
    // Or allow login here.
    this.authService.loginWithGoogle().then(() => {
      // After login, check roles in subscription
    });
  }

  // Player Auth
  gameId = '';
  // playerNumber is defined above at line 48
  pin = '';
  isRegistering = false;
  authError = '';

  // Settings
  // showSettings & newName are defined above at lines 37-38

  // UI State
  showLabels = true;

  toggleLabels() {
    this.showLabels = !this.showLabels;
  }

  updateReadOnly() {
    const isImpersonating = localStorage.getItem('soil_admin_impersonating') === 'true';
    const isHistory = this.viewingRound < this.maxRoundNumber;
    this.isReadOnly = isImpersonating || this.isSubmitted || isHistory;
  }

  goToRound(roundNum: number) {
    if (roundNum < 0 || roundNum > this.maxRoundNumber) return;
    this.viewingRound = roundNum;

    if (roundNum === this.maxRoundNumber) {
      // Restore live state
      this.parcels = this.gameService.getParcelsValue();
      this.updateReadOnly();
    } else {
      const round = this.history.find(r => r.number === roundNum);
      if (round) {
        this.parcels = round.parcelsSnapshot;
        this.updateReadOnly();
      }
    }
  }

  toggleNutrition() { this.showNutritionOverlay = !this.showNutritionOverlay; }
  toggleHarvest() { this.showHarvestOverlay = !this.showHarvestOverlay; }
  toggleSoil() { this.showSoilOverlay = !this.showSoilOverlay; }
  toggleMobileMenu() { this.showMobileMenu = !this.showMobileMenu; }
  toggleFinance() {
    if (this.maxRoundNumber === 0) return;
    this.showFinance = !this.showFinance;
  }

  async playerLogin() {
    try {
      this.authError = '';
      await this.authService.loginAsPlayer(this.gameId, this.pin);
    } catch (e: any) {
      this.authError = e.message;
    }
  }

  async logout() {
    if (this.isReadOnly) {
      const restored = await this.authService.stopImpersonation();
      if (restored) {
        this.router.navigate(['/admin']);
        return;
      }
    }
    await this.authService.logout();
    this.router.navigate(['/']);
  }

  startEditName() {
    if (!this.isPlayer) return;
    this.authService.user$.pipe(take(1)).subscribe(user => {
      this.tempName = user?.displayName || (this.playerLabel + ' ' + (this.playerNumber || ''));
      this.isEditingName = true;
    });
  }

  async saveName() {
    if (this.tempName && this.tempName.trim().length > 0) {
      try {
        await this.authService.updateDisplayName(this.tempName);
        this.isEditingName = false;
      } catch (error) {
        console.error('Failed to update name:', error);
      }
    } else {
      this.isEditingName = false;
    }
  }

  // --- Selection Logic ---
  private dragStartIndex: number | null = null;
  cols = 8; // Dynamic columns
  rows = 5; // Dynamic rows

  // Touch handling properties
  private touchStartIndex: number | null = null; // To track initial touch if needed, or just use dragStartIndex

  @HostListener('window:resize')
  onResize() {
    this.checkOrientation();
  }

  checkOrientation() {
    const isPortrait = window.innerWidth < window.innerHeight;
    this.cols = isPortrait ? 5 : 8;
    this.rows = Math.ceil(this.parcels.length / this.cols);
  }

  // --- Touch Events ---

  // Prevent default scroll when touching the grid
  onTouchStart(event: TouchEvent) {
    if (this.isReadOnly) return;
    // Don't prevent default immediately if we want to allow scrolling elsewhere? 
    // But user requested "Selection of multiple parcels should also be possible on mobile"
    // and "prevent overscroll".
    // If we are touching the GRID, we probably want to select.
    if (event.cancelable) event.preventDefault();

    this.isDragging = true;
    const index = this.getParcelIndexFromTouch(event.touches[0]);
    if (index !== -1) {
      if (!event.metaKey && !event.shiftKey) { // Meta/Shift unlikely on mobile but good practice
        this.selectedIndices.clear();
      }
      this.dragStartIndex = index;
      this.updateSelection(index);
    }
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;
    if (event.cancelable) event.preventDefault();

    const index = this.getParcelIndexFromTouch(event.touches[0]);
    if (index !== -1) {
      this.updateSelection(index);
    }
  }

  onTouchEnd(event: TouchEvent) {
    this.isDragging = false;
    this.dragStartIndex = null;
    if (this.selectedIndices.size > 0 && !this.isReadOnly) {
      this.showPlantingModal = true;
    }
  }

  private getParcelIndexFromTouch(touch: Touch): number {
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    // We need to find the parcel index. The element might be the img or div inside app-parcel.
    // We can assume app-parcel has the index? Or we can just calculate from coordinates?
    // Using elementFromPoint is safer if layout is complex.
    // Let's assume the element or its parent is app-parcel.
    const parcelElement = element?.closest('app-parcel');
    if (!parcelElement) return -1;

    // We need to associate the element with an index. 
    // We can extract it from DOM if we bind it, or...
    // Let's verify how app-parcel is rendered. It's in an *ngFor with index.
    // We can bind [attr.data-index]="i" to app-parcel in HTML.
    const indexStr = parcelElement.getAttribute('data-index');
    return indexStr ? parseInt(indexStr, 10) : -1;
  }


  onMouseDown(index: number, event: MouseEvent) {
    if (this.isReadOnly) return;
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
      this.selectedIndices.clear();
    }
    this.isDragging = true;
    this.dragStartIndex = index;
    this.updateSelection(index);
    event.preventDefault(); // Prevent native drag to ensure custom selection works
  }

  onMouseEnter(index: number) {
    if (this.isDragging && this.dragStartIndex !== null) {
      this.updateSelection(index);
    }
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isDragging = false;
    this.dragStartIndex = null;

    // Auto-open modal if we have a selection and are not read-only
    if (this.selectedIndices.size > 0 && !this.isReadOnly) {
      this.showPlantingModal = true;
    }
  }

  updateSelection(currentIndex: number) {
    if (this.dragStartIndex === null) return;

    this.selectedIndices.clear(); // Simply clear and draw new box for now.

    const startRow = Math.floor(this.dragStartIndex / this.cols);
    const startCol = this.dragStartIndex % this.cols;

    const endRow = Math.floor(currentIndex / this.cols);
    const endCol = currentIndex % this.cols;

    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);
    const minCol = Math.min(startCol, endCol);
    const maxCol = Math.max(startCol, endCol);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const index = r * this.cols + c;
        if (index < this.parcels.length) {
          this.selectedIndices.add(index);
        }
      }
    }
    this.selectedIndices = new Set(this.selectedIndices);
  }

  isSelected(index: number): boolean {
    return this.selectedIndices.has(index);
  }

  // --- Game Actions ---


  openPlantingModal() {
    if (this.selectedIndices.size === 0) return;
    this.showPlantingModal = true;
  }

  onCropSelected(crop: CropType) {
    // Update planned decision in service
    this.selectedIndices.forEach(index => {
      this.gameService.updateParcelDecision(index, crop, this.gameId);
    });
    this.showPlantingModal = false;
    this.selectedIndices = new Set();
  }

  onPlantingCancel() {
    this.showPlantingModal = false;
    this.selectedIndices = new Set();
  }

  errorMessage = '';

  openRoundSettings() {
    this.showRoundSettingsModal = true;
  }

  pendingNextRound = false;

  onRoundSettingsSaved(settings: RoundSettings) {
    this.currentRoundSettings = settings;
    this.showRoundSettingsModal = false;
    if (this.pendingNextRound) {
      this.executeNextRound();
    }
  }

  async nextRound() {
    this.pendingNextRound = true;
    this.showRoundSettingsModal = true;
  }

  cancelRoundSettings() {
    this.pendingNextRound = false;
    this.showRoundSettingsModal = false;
  }



  async executeNextRound() {
    try {
      // Keep pendingNextRound true while submitting
      const result = await this.gameService.submitRound(this.gameId, this.currentRoundSettings);

      if ('status' in result && result.status === 'submitted') {
        this.isSubmitted = true;
        this.updateReadOnly();
      } else {
        // Round advanced (calculated)
        const round = result as Round;
        this.history.push(round);
        this.maxRoundNumber = round.number;
        this.viewingRound = this.maxRoundNumber;
        this.isSubmitted = false;
        this.updateReadOnly();

        // Show Result Modal
        this.roundResultRound = round;
        this.showRoundResultModal = true;
      }
      this.selectedIndices = new Set();
    } catch (error: any) {
      console.error('Error submitting round', error);
      this.errorMessage = error.message || 'Failed to submit round. Please try again.';
    } finally {
      this.pendingNextRound = false;
    }
  }

  onBackgroundClick(event: MouseEvent) {
    if (this.selectedIndices.size > 0 && !this.showPlantingModal) {
      this.selectedIndices.clear();
    }
  }

  closeRoundResultModal() {
    this.showRoundResultModal = false;
  }

  private calculateWinners(game: any) {
    if (!game.players) return;
    const playerList = Object.values(game.players) as any[];
    if (playerList.length === 0) return;

    const getPlayerName = (p: any) => p.displayName || `${this.playerLabel} ${p.uid.startsWith('player-') ? p.uid.split('-')[2] : ''}`;

    // Financial Winner
    let bestFinancial = playerList[0];
    playerList.forEach(p => {
      if ((p.capital || 0) > (bestFinancial.capital || 0)) {
        bestFinancial = p;
      }
    });
    this.financialWinner = {
      name: getPlayerName(bestFinancial),
      capital: bestFinancial.capital || 0
    };

    // Soil Winner
    let bestSoilPlayer = playerList[0];
    let bestAvgSoil = this.calculateAvgSoil(bestSoilPlayer);

    playerList.forEach(p => {
      const avg = this.calculateAvgSoil(p);
      if (avg > bestAvgSoil) {
        bestAvgSoil = avg;
        bestSoilPlayer = p;
      }
    });

    this.soilWinner = {
      name: getPlayerName(bestSoilPlayer),
      avgSoil: Math.round(bestAvgSoil)
    };
  }

  private calculateAvgSoil(player: any): number {
    const history = player.history || [];
    if (history.length === 0) return 0;
    const lastRound = history[history.length - 1];
    const parcels = lastRound.parcelsSnapshot || [];
    if (parcels.length === 0) return 0;
    const totalSoil = parcels.reduce((sum: number, p: any) => sum + (p.soil || 0), 0);
    return totalSoil / parcels.length;
  }

  closeGameEndModal() {
    this.showGameEndModal = false;
  }
}
