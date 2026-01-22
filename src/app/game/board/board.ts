import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, inject, type OnDestroy, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, type Params, Router, RouterLink } from '@angular/router';
import type { User } from 'firebase/auth';
import { combineLatest, take } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { GAME_CONSTANTS } from '../../game-constants';
import { LanguageService } from '../../services/language.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';
import type { CropType, Game, Parcel as ParcelType, PlayerState, Round, RoundDecision } from '../../types';
import { Finance } from '../finance/finance';
import { GameService } from '../game.service';
import { Parcel } from '../parcel/parcel';
import { PlantingModal } from '../planting-modal/planting-modal';
import { RoundResultModal } from '../round-result-modal/round-result-modal';
import { type RoundSettings, RoundSettingsModal } from '../round-settings-modal/round-settings-modal';
import { BoardHudComponent } from './components/board-hud';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    Parcel,
    PlantingModal,
    RoundSettingsModal,
    RoundResultModal,
    RouterLink,
    FormsModule,
    LanguageSwitcherComponent,
    Finance,
    BoardHudComponent,
  ],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board implements OnInit, OnDestroy {
  t(key: string): string {
    const translations: Record<string, string> = {
      'board.login.phGameId': $localize`:Form Placeholder|Placeholder for game ID input@@board.login.phGameId:Game ID`,
      'board.login.phPlayerNum': $localize`:Form Placeholder|Placeholder for player number input@@board.login.phPlayerNum:Player Number`,
      'board.login.phPin': $localize`:Form Placeholder|Placeholder for PIN input@@board.login.phPin:PIN`,
      'user.photoURL': $localize`:Asset Path|Default user photo path@@user.photoURL:assets/images/gut.jpg`,
      'board.nav.names': $localize`:Nav Label|Toggle display of field names@@board.nav.names:Namen`,
      'board.nav.nutrition': $localize`:Nav Label|Toggle display of nutrition levels@@board.nav.nutrition:Mineralstoffe`,
      'board.nav.harvest': $localize`:Nav Label|Toggle display of harvest yields@@board.nav.harvest:Ernte`,
      'board.nav.soil': $localize`:Nav Label|Toggle display of soil quality@@board.nav.soil:Bodenqualität`,
      'board.nav.finance': $localize`:Nav Label|Toggle display of financial report@@board.nav.finance:Finanzen`,
      'board.nav.options': $localize`:Nav Label|Open round options@@board.nav.options:Optionen`,
      'board.nav.waiting': $localize`:Status Message|Wait message after round submission@@board.nav.waiting:Warten...`,
      'board.nav.nextRound': $localize`:Action Label|Button to submit round and proceed@@board.nav.nextRound:Nächste Runde`,
      'board.logout': $localize`:Action Label|Logout button text@@board.logout:Abmelden`,
      'board.logout.title': $localize`:Action Label|Tooltip for the logout button@@board.logout.title:Logout`,
    };
    return translations[key] || key;
  }
  private gameService = inject(GameService);
  gameServicePublic = this.gameService; // Expose for template if needed, or just specific streams
  gameState$ = this.gameService.state$;

  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  parcels: ParcelType[] = []; // populated via subscription
  selectedIndices = new Set<number>(); // Selection
  isDragging = false;
  selectionStart: number | null = null;
  private cdr = inject(ChangeDetectorRef);
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
    organisms: false,
  };

  availableCrops: CropType[] = [
    'Wheat',
    'Corn',
    'Potato',
    'Beet',
    'Barley',
    'Oat',
    'Rye',
    'Fieldbean',
    'Rapeseed',
    'Pea',
    'Grass',
    'Fallow',
  ];

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
  playerNumber: string | null = null;

  // Timer
  countdownText = '';
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // Game End Logic
  showGameEndModal = false;
  financialWinner: { name: string; capital: number } | null = null;
  soilWinner: { name: string; avgSoil: number } | null = null;

  // Inline Name Editing
  isEditingName = false;
  tempName = '';

  gameId = '';
  pin = '';
  authError: string | null = null;
  showLabels = true;
  pendingNextRound = false;

  login() {
    this.authService.loginWithGoogle();
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
  }

  updateReadOnly() {
    // Logic to determine if board is read-only
    this.isReadOnly = this.isSubmitted || this.viewingRound < this.maxRoundNumber;
  }

  goToRound(round: number) {
    if (round >= 0 && round <= this.maxRoundNumber) {
      this.viewingRound = round;
      this.updateReadOnly();
      this.updateParcelsForViewingRound();
    }
  }

  private updateParcelsForViewingRound() {
    if (this.viewingRound === this.maxRoundNumber) {
      // Current round: use parcels from gameService (which handles drafts)
      this.gameService
        .getParcels()
        .pipe(take(1))
        .subscribe((parcels) => {
          this.parcels = parcels;
          this.checkOrientation();
          this.cdr.detectChanges();
        });
    } else {
      // Historical round: use parcels from history
      const histRound = this.history.find((r) => r.number === this.viewingRound);
      if (histRound) {
        if (histRound.parcelsSnapshot && histRound.parcelsSnapshot.length > 0) {
          this.parcels = histRound.parcelsSnapshot;
          this.checkOrientation();
          this.cdr.detectChanges();
        } else {
          // Parcels missing (lightweight history), fetch them
          this.gameService.getRoundData(this.gameId, this.viewingRound).then((fullRound) => {
            // Update history with full data to cache it in the component
            histRound.parcelsSnapshot = fullRound.parcelsSnapshot;
            // Only update if we are still viewing this round
            if (this.viewingRound === fullRound.number) {
              this.parcels = fullRound.parcelsSnapshot;
              this.checkOrientation();
              this.cdr.detectChanges();
            }
          });
        }
      }
    }
  }

  toggleLabels() {
    this.showLabels = !this.showLabels;
  }

  toggleNutrition() {
    this.showNutritionOverlay = !this.showNutritionOverlay;
  }

  toggleHarvest() {
    this.showHarvestOverlay = !this.showHarvestOverlay;
  }

  toggleSoil() {
    this.showSoilOverlay = !this.showSoilOverlay;
  }

  toggleFinance() {
    this.showFinance = !this.showFinance;
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }

  ngOnInit() {
    combineLatest([this.route.queryParams, this.user$]).subscribe(async ([params, user]: [Params, User | null]) => {
      if (!user) {
        this.router.navigate(['/']);
        return;
      }
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        const claims = idTokenResult.claims;

        // Extract Game ID
        let activeGameId = params.gameId || (claims.gameId as string);
        if (!activeGameId) {
          if (user.uid.startsWith('player-')) {
            const parts = user.uid.split('-');
            if (parts.length >= 3) {
              activeGameId = parts[1];
            }
          } else if (claims.gameId) {
            activeGameId = claims.gameId as string;
          }
        }

        if (activeGameId) {
          this.gameId = activeGameId;
          const gameState = await this.gameService.loadGame(activeGameId);
          if (gameState) {
            this.gameService.state$.subscribe((state) => {
              if (state?.game) {
                this.maxRoundNumber = state.game.currentRoundNumber;
                // Only move viewingRound to max if it was previously at the old max
                const wasAtMax = this.viewingRound === this.maxRoundNumber - 1 || this.maxRoundNumber === 0;

                this.playerLabel = state.game.settings?.playerLabel || 'Player';
                this.playerNumber = state.playerState?.playerNumber ? String(state.playerState.playerNumber) : null;
                this.history = state.playerState?.history || [];

                if (wasAtMax || this.viewingRound === 0) {
                  this.viewingRound = this.maxRoundNumber;
                }

                this.isSubmitted = state.playerState?.submittedRound === this.maxRoundNumber;
                this.updateReadOnly();
                this.updateParcelsForViewingRound();

                // Timer Logic
                this.updateTimer(state.game);

                // Detect Game Finished
                if (state.game.status === 'finished' && !this.showGameEndModal) {
                  this.calculateWinners(state.game);
                  this.showGameEndModal = true;
                }
              }
            });

            this.gameService.getParcels().subscribe((parcels) => {
              if (this.viewingRound === this.maxRoundNumber) {
                this.parcels = parcels;
                this.checkOrientation();
              }
            });
          }
        }

        if (claims.role === 'player' || user.uid.startsWith('player-')) {
          Promise.resolve().then(() => {
            this.isPlayer = true;
          });
        } else {
          this.router.navigate(['/admin']);
        }
      }
    });

    this.checkOrientation();
    this.timerInterval = setInterval(() => {
      this.gameService.state$.pipe(take(1)).subscribe((state) => {
        if (state?.game) this.updateTimer(state.game);
      });
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private updateTimer(game: Game) {
    const deadline = game.roundDeadlines?.[game.currentRoundNumber];
    if (!deadline) {
      this.countdownText = '';
      return;
    }

    const target =
      deadline && 'seconds' in deadline ? deadline.seconds * 1000 : new Date(deadline as unknown as string).getTime();
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      this.countdownText = '00:00';
    } else {
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      this.countdownText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    this.cdr.detectChanges();
  }

  handlePlayerLogin(credentials: { gameId: string; playerNumber: string; pin: string }) {
    this.gameId = credentials.gameId;
    this.playerNumber = credentials.playerNumber;
    this.pin = credentials.pin;
    this.playerLogin();
  }

  onSaveName(name: string) {
    this.tempName = name;
    this.saveName();
  }

  async playerLogin() {
    this.authError = null;
    if (!this.gameId || !this.playerNumber || !this.pin) {
      this.authError = 'Please enter Game ID, Player Number and PIN';
      return;
    }
  }

  startEditName() {
    if (!this.isPlayer) return;
    this.authService.user$.pipe(take(1)).subscribe((user) => {
      this.tempName = user?.displayName || `${this.playerLabel} ${this.playerNumber || ''}`;
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
      if (!event.metaKey && !event.shiftKey) {
        // Meta/Shift unlikely on mobile but good practice
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

  onTouchEnd(_event: TouchEvent) {
    this.isDragging = false;
    this.dragStartIndex = null;
    if (this.selectedIndices.size > 0 && !this.isReadOnly) {
      Promise.resolve().then(() => (this.showPlantingModal = true));
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
      Promise.resolve().then(() => (this.showPlantingModal = true));
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
    this.selectedIndices.forEach((index) => {
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

  getPlantedCrops(): CropType[] {
    const crops = new Set<CropType>();
    this.parcels.forEach((p) => {
      if (p.crop !== 'Fallow' && p.crop !== 'Grass') {
        crops.add(p.crop);
      }
    });
    return Array.from(crops);
  }

  async executeNextRound() {
    try {
      const parcels: Record<number, CropType> = {};
      this.parcels.forEach((p, i) => {
        parcels[i] = p.crop;
      });

      const decision: RoundDecision = {
        ...this.currentRoundSettings,
        parcels,
      };

      // Keep pendingNextRound true while submitting
      const result: any = await this.gameService.submitDecision(this.gameId, decision);

      if (result && 'status' in result && result.status === 'submitted') {
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
    } catch (error: unknown) {
      console.error('Error submitting round', error);
      this.errorMessage = (error as Error).message || 'Failed to submit round. Please try again.';
    } finally {
      this.pendingNextRound = false;
    }
  }

  onBackgroundClick(_event: MouseEvent) {
    if (this.selectedIndices.size > 0 && !this.showPlantingModal) {
      this.selectedIndices.clear();
    }
  }

  closeRoundResultModal() {
    this.showRoundResultModal = false;
  }

  get selectedRoundWeatherData(): { icon: string; name: string } {
    const round = this.history.find((r) => r.number === this.viewingRound);
    const weather = (round?.result?.events?.weather || 'Normal') as keyof typeof GAME_CONSTANTS.WEATHER_EFFECTS;
    const icons: Record<string, string> = {
      Normal: '☀️',
      Drought: '🏜️',
      LateFrost: '❄️',
      SummerDrought: '🔥',
      Flood: '🌊',
      Storm: '💨',
    };

    return {
      icon: icons[weather] || '☀️',
      name: GAME_CONSTANTS.WEATHER_EFFECTS[weather]?.name || weather,
    };
  }

  get selectedRoundPestsData(): { icon: string; name: string }[] {
    const round = this.history.find((r) => r.number === this.viewingRound);
    const pests = round?.result?.events?.vermin;
    if (!Array.isArray(pests) || pests.length === 0) return [];

    const iconMap: Record<string, string> = {
      'potato-beetle': '🪲',
      'corn-borer': '🦋',
      'aphid-black': '🐜',
      'aphid-cereal': '🦟',
      'pollen-beetle': '✨',
      nematode: '🐍',
      'pea-moth': '🐛',
      'oat-rust': '🍄',
      wireworm: '🐛',
      fritfly: '🪰',
    };

    return pests.map((p) => ({
      name: GAME_CONSTANTS.VERMIN_EFFECTS[p as keyof typeof GAME_CONSTANTS.VERMIN_EFFECTS]?.name || p,
      icon: iconMap[p] || '🐛',
    }));
  }

  private calculateWinners(game: Game) {
    if (!game.players) return;
    const playerList = Object.values(game.players);
    if (playerList.length === 0) return;

    const getPlayerName = (p: PlayerState) =>
      p.displayName || `${this.playerLabel} ${p.uid.startsWith('player-') ? p.uid.split('-')[2] : ''}`;

    // Financial Winner
    let bestFinancial = playerList[0];
    playerList.forEach((p) => {
      if ((p.capital || 0) > (bestFinancial.capital || 0)) {
        bestFinancial = p;
      }
    });
    this.financialWinner = {
      name: getPlayerName(bestFinancial),
      capital: bestFinancial.capital || 0,
    };

    // Soil Winner
    let bestSoilPlayer = playerList[0];
    let bestAvgSoil = this.calculateAvgSoil(bestSoilPlayer);

    playerList.forEach((p) => {
      const avg = this.calculateAvgSoil(p);
      if (avg > bestAvgSoil) {
        bestAvgSoil = avg;
        bestSoilPlayer = p;
      }
    });

    this.soilWinner = {
      name: getPlayerName(bestSoilPlayer),
      avgSoil: Math.round(bestAvgSoil),
    };
  }

  private calculateAvgSoil(player: PlayerState): number {
    const history = player.history || [];
    if (history.length === 0) return 0;
    const lastRound = history[history.length - 1];
    const parcels = lastRound.parcelsSnapshot || [];
    if (parcels.length === 0) return 0;
    const totalSoil = parcels.reduce((sum: number, p: ParcelType) => sum + (p.soil || 0), 0);
    return totalSoil / parcels.length;
  }

  closeGameEndModal() {
    this.showGameEndModal = false;
  }
}
