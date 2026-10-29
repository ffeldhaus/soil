import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, inject, type OnDestroy, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, type Params, Router, RouterLink } from '@angular/router';
import type { User } from 'firebase/auth';
import { combineLatest, type Subscription, take } from 'rxjs';
import { FeedbackModal } from '../../admin/components/feedback-modal/feedback-modal';
import { AuthService } from '../../auth/auth.service';
import { GAME_CONSTANTS, STICKER_DEFINITIONS } from '../../game-constants';
import type {
  CollectibleSticker,
  CropType,
  Game,
  Parcel as ParcelType,
  PlayerState,
  RegionalContract,
  Round,
  RoundDecision,
  WeatherForecast,
} from '../../types';
import { GameEngine } from '../engine/game-engine';
import { Finance } from '../finance/finance';
import { GameService } from '../game.service';
import { Parcel } from '../parcel/parcel';
import { PlantingModal } from '../planting-modal/planting-modal';
import { type LeaderboardEntry, RoundResultModal } from '../round-result-modal/round-result-modal';
import { type RoundSettings, RoundSettingsModal } from '../round-settings-modal/round-settings-modal';
import { TourService } from '../tour.service';
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
    Finance,
    BoardHudComponent,
    FeedbackModal,
  ],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board implements OnInit, OnDestroy {
  t(key: string): string {
    const translations: Record<string, string> = {
      'board.login.phGameId': 'Game ID',
      'board.login.phPlayerNum': 'Player Number',
      'board.login.phPin': 'PIN',
      'user.photoURL': 'assets/images/gut.jpg',
      'board.nav.names': 'Namen',
      'board.nav.nutrition': 'Mineralstoffe',
      'board.nav.harvest': 'Ernte',
      'board.nav.soil': 'Bodenqualität',
      'board.nav.finance': 'Finanzen',
      'board.nav.waiting': 'Warten...',
      'board.nav.nextRound': 'Nächste Runde',
      'board.logout': 'Abmelden',
      'board.logout.title': 'Logout',
    };
    return translations[key] ?? key;
  }
  private gameService = inject(GameService);
  public tourService = inject(TourService);
  gameServicePublic = this.gameService; // Expose for template if needed, or just specific streams
  gameState$ = this.gameService.state$;
  version = (import.meta as { env: { APP_VERSION?: string } }).env.APP_VERSION || 'dev';

  authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  parcels: ParcelType[] = []; // populated via subscription
  selectedIndices = new Set<number>(); // Selection
  isDragging = false;
  selectionStart: number | null = null;
  private cdr = inject(ChangeDetectorRef);
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
  isResearchReplay = false;
  isPlayer = false;
  viewingRound = 0;
  maxRoundNumber = 0;
  totalRounds = 20;
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
  overallWinner: { name: string; score: number; capital: number; avgSoil: number } | null = null;
  financialWinner: { name: string; capital: number } | null = null;
  soilWinner: { name: string; avgSoil: number } | null = null;
  finalStandings: LeaderboardEntry[] = [];

  // Collectible Stickers
  collectedStickerIds: string[] = [];
  allStickers: CollectibleSticker[] = STICKER_DEFINITIONS;
  showStickerAlbumModal = false;
  showWelcomeModal = false;
  activeHudPopover: 'weather' | 'pests' | 'contract' | null = null;
  showContractPopover = false;

  toggleHudPopover(type: 'weather' | 'pests' | 'contract', event?: Event) {
    event?.stopPropagation();
    this.activeHudPopover = this.activeHudPopover === type ? null : type;
    this.showContractPopover = this.activeHudPopover === 'contract';
  }

  closeWelcomeModal() {
    this.showWelcomeModal = false;
    this.tourService.markTourAsSeen();
    if (typeof window !== 'undefined' && this.gameId) {
      localStorage.setItem(`soil_welcome_seen_${this.gameId}`, 'true');
    }
  }

  startTourFromWelcome() {
    this.closeWelcomeModal();
    this.tourService.setTourDisabled(false);
    this.tourService.resetTour();
    this.tourService.startTour();
  }

  // Feedback Logic
  feedback: {
    category: 'interface' | 'mechanics' | 'improvements' | 'suggestions' | 'documentation' | 'other';
    rating: number;
    comment: string;
    email?: string;
  } = {
    category: 'other',
    rating: 5,
    comment: '',
    email: '',
  };
  includeFeedbackEmail = true;
  isSubmittingFeedback = false;
  feedbackSubmitted = false;
  showFeedbackModal = false;

  onModalFeedbackSubmit(payload: {
    category: 'interface' | 'mechanics' | 'improvements' | 'suggestions' | 'documentation' | 'other';
    rating: number;
    comment: string;
    email?: string;
  }) {
    this.isSubmittingFeedback = true;
    this.gameService
      .submitFeedback(payload)
      .then(() => {
        this.isSubmittingFeedback = false;
        this.feedbackSubmitted = true;
        this.showFeedbackModal = false;
      })
      .catch((error) => {
        this.isSubmittingFeedback = false;
        console.error('Failed to submit feedback:', error);
      });
  }

  // Inline Name Editing
  isEditingName = false;
  tempName = '';

  gameId = '';
  pin = '';
  authError: string | null = null;
  private routeSub: Subscription | null = null;
  private gameStatusSub: Subscription | null = null;
  private parcelsSub: Subscription | null = null;
  private tourSub: Subscription | null = null;

  showLabels = true;
  tourStarted = false;
  pendingNextRound = false;

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;
  }

  updateReadOnly() {
    // Logic to determine if board is read-only
    const state = this.gameService.state;
    const isFinished = state?.game?.status === 'finished';
    this.isReadOnly = isFinished || this.isSubmitted || this.viewingRound < this.maxRoundNumber;
  }

  goToRound(round: number) {
    if (round >= 0 && round <= this.maxRoundNumber) {
      this.viewingRound = round;
      this.updateReadOnly();
      const targetUid = this.route.snapshot?.queryParams?.playerUid;
      this.updateParcelsForViewingRound(targetUid);
    }
  }

  private updateParcelsForViewingRound(targetUid?: string) {
    this.ensurePreviousRoundParcelsLoaded(this.viewingRound, targetUid);
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
          this.gameService.getRoundData(this.gameId, this.viewingRound, targetUid).then((fullRound) => {
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

  private ensurePreviousRoundParcelsLoaded(roundNumber: number, targetUid?: string) {
    if (roundNumber <= 0 || !this.gameId) return;
    const prevRound = this.history.find((r) => r.number === roundNumber - 1);
    if (prevRound && (!prevRound.parcelsSnapshot || prevRound.parcelsSnapshot.length === 0)) {
      this.gameService
        .getRoundData(this.gameId, roundNumber - 1, targetUid)
        .then((fullRound) => {
          prevRound.parcelsSnapshot = fullRound.parcelsSnapshot;
          this.cdr.detectChanges();
        })
        .catch(() => {});
    }
  }

  onFeedbackSubmit() {
    this.isSubmittingFeedback = true;
    const user = this.authService.currentUser;
    const loggedInEmail = user && !user.isAnonymous && user.email ? user.email : null;
    const contactEmail = loggedInEmail
      ? this.includeFeedbackEmail
        ? loggedInEmail
        : undefined
      : this.feedback.email?.trim() || undefined;
    this.gameService
      .submitFeedback({
        category: this.feedback.category,
        rating: this.feedback.rating,
        comment: this.feedback.comment,
        ...(contactEmail ? { email: contactEmail } : {}),
      })
      .then(() => {
        this.isSubmittingFeedback = false;
        this.feedbackSubmitted = true;
      })
      .catch((error) => {
        this.isSubmittingFeedback = false;
        console.error('Failed to submit feedback:', error);
        alert('Feedback konnte nicht gesendet werden. Bitte versuche es später erneut.');
      });
  }

  toggleLabels() {
    if (this.showFinance) return;
    this.showLabels = !this.showLabels;
  }

  toggleNutrition() {
    if (this.showFinance) return;
    this.showNutritionOverlay = !this.showNutritionOverlay;
  }

  toggleHarvest() {
    if (this.showFinance) return;
    this.showHarvestOverlay = !this.showHarvestOverlay;
  }

  toggleSoil() {
    if (this.showFinance) return;
    this.showSoilOverlay = !this.showSoilOverlay;
  }

  toggleFinance() {
    this.showFinance = !this.showFinance;
  }

  async logout() {
    if (this.isResearchReplay) {
      this.router.navigate(['/research']);
      return;
    }
    await this.authService.logout();
    this.router.navigate(['/']);
  }

  ngOnInit() {
    this.syncCollectedStickers();
    this.tourSub = this.tourService.stepShow$.subscribe((stepId) => {
      if (stepId === 'planting-modal' || stepId === 'planting-modal-crop') {
        if (this.selectedIndices.size === 0) {
          this.selectedIndices.add(0);
          this.selectedIndices = new Set(this.selectedIndices);
        }
        this.showPlantingModal = true;
        this.cdr.detectChanges();
      } else if (stepId === 'tour-finished' || stepId === 'tour-cancelled') {
        this.showPlantingModal = false;
        this.selectedIndices.clear();
        this.selectedIndices = new Set(this.selectedIndices);
        this.cdr.detectChanges();
      } else if (this.showPlantingModal && stepId !== 'planting-modal' && stepId !== 'planting-modal-crop') {
        this.showPlantingModal = false;
        this.cdr.detectChanges();
      }
    });

    this.routeSub = combineLatest([this.route.queryParams, this.user$]).subscribe(
      async ([params, user]: [Params, User | null]) => {
        await this.handleRouteAndUserChange(params, user);
      },
    );

    this.checkOrientation();
    this.timerInterval = setInterval(() => {
      this.gameService.state$.pipe(take(1)).subscribe((state) => {
        if (state?.game) this.updateTimer(state.game);
      });
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.gameStatusSub) this.gameStatusSub.unsubscribe();
    if (this.parcelsSub) this.parcelsSub.unsubscribe();
    if (this.tourSub) this.tourSub.unsubscribe();
  }

  private isBrowserTestMode(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage.getItem('soil_test_mode') === 'true'
    );
  }

  private resolveActiveGameId(params: Params, user: User | null, claims: Record<string, unknown>): string | undefined {
    const directId = params.gameId || (claims.gameId as string | undefined);
    if (directId || !user) return directId;
    if (user.uid.startsWith('player-')) {
      const parts = user.uid.split('-');
      return parts.length >= 3 ? parts[1] : undefined;
    }
    return claims.gameId as string | undefined;
  }

  private shouldShowFirstVisitWelcome(): boolean {
    if (this.isReadOnly || this.tourStarted || typeof window === 'undefined') return false;
    if (this.tourService.isTourSeen() || this.tourService.isTourDisabled()) return false;
    return localStorage.getItem(`soil_welcome_seen_${this.gameId}`) !== 'true';
  }

  private applyGameStateUpdate(
    state: NonNullable<typeof this.gameService.state>,
    viewOnly: boolean,
    targetUid: string,
  ): void {
    const game = state.game;
    if (!game) return;

    this.maxRoundNumber = game.currentRoundNumber;
    this.totalRounds = game.settings?.length || GAME_CONSTANTS.DEFAULT_ROUNDS;
    const wasAtMax = this.viewingRound === this.maxRoundNumber - 1 || this.maxRoundNumber === 0;

    this.playerLabel = game.settings?.playerLabel || 'Player';
    this.playerNumber = state.playerState?.playerNumber ? String(state.playerState.playerNumber) : null;
    this.history = state.playerState?.history || [];
    this.syncCollectedStickers(state.playerState?.unlockedStickers);

    if (wasAtMax || this.viewingRound === 0) {
      this.viewingRound = this.maxRoundNumber;
    }
    this.isSubmitted = state.playerState?.submittedRound === this.maxRoundNumber;

    if (viewOnly) {
      this.isReadOnly = true;
      this.showReadOnlyBanner = true;
    } else {
      this.updateReadOnly();
    }

    this.updateParcelsForViewingRound(targetUid);
    this.updateTimer(game);

    if (game.status === 'finished' && !this.showGameEndModal) {
      this.calculateWinners(game);
      this.showGameEndModal = true;
    }

    if (this.shouldShowFirstVisitWelcome()) {
      this.tourStarted = true;
      this.showWelcomeModal = true;
    }
  }

  private subscribeToLoadedGame(viewOnly: boolean, targetUid: string): void {
    if (this.gameStatusSub) this.gameStatusSub.unsubscribe();
    if (this.parcelsSub) this.parcelsSub.unsubscribe();

    this.gameStatusSub = this.gameService.state$.subscribe((state) => {
      if (state) this.applyGameStateUpdate(state, viewOnly, targetUid);
    });

    this.parcelsSub = this.gameService.getParcels().subscribe((parcels) => {
      if (this.viewingRound === this.maxRoundNumber) {
        this.parcels = parcels;
        this.checkOrientation();
      }
    });
  }

  private applyUserRoleState(user: User | null, claims: Record<string, unknown>, allowPublicReadOnly: boolean): void {
    if (allowPublicReadOnly) {
      this.isPlayer = false;
      return;
    }
    if (user && (claims.role === 'player' || user.uid.startsWith('player-'))) {
      Promise.resolve().then(() => {
        this.isPlayer = true;
      });
      return;
    }
    const isAdminUser =
      user && (claims.role === 'superadmin' || claims.role === 'admin' || user.email === 'florian.feldhaus@gmail.com');
    if (isAdminUser) {
      this.isPlayer = false;
    } else {
      this.router.navigate(['/admin']);
    }
  }

  private async handleRouteAndUserChange(params: Params, user: User | null): Promise<void> {
    const viewOnly = params.viewOnly === 'true';
    const rawGameId = String(params.gameId || '');
    const isResearchGame = rawGameId.startsWith('research');
    const allowPublicReadOnly = viewOnly && (isResearchGame || this.isBrowserTestMode());
    this.isResearchReplay = isResearchGame;

    if (!user && !allowPublicReadOnly) {
      this.router.navigate(['/']);
      return;
    }

    const claims = user ? (await user.getIdTokenResult()).claims : {};
    const activeGameId = this.resolveActiveGameId(params, user, claims);
    const targetUid = params.playerUid as string;

    if (activeGameId) {
      this.gameId = activeGameId;
      if (allowPublicReadOnly) {
        this.isReadOnly = true;
        this.showReadOnlyBanner = true;
        this.isPlayer = false;
      }
      const gameState = await this.gameService.loadGame(activeGameId, targetUid);
      if (gameState) {
        this.subscribeToLoadedGame(viewOnly, targetUid);
      }
    }

    this.applyUserRoleState(user, claims, allowPublicReadOnly);
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

  getDisplayName(user: User | null): string {
    // If we have a player state (either we are the player or an admin/researcher viewing the player)
    const state = this.gameService.state;
    if (state?.playerState?.displayName) {
      return state.playerState.displayName;
    }

    if (!user) return `${this.playerLabel} ${this.playerNumber || '1'}`.trim();

    // If it's a real user (not anonymous) OR a guest who changed their name
    if (user.displayName && user.displayName !== 'Guest') {
      return user.displayName;
    }

    if (this.isPlayer) {
      return `${this.playerLabel} ${this.playerNumber || ''}`;
    }

    return user.displayName || 'Guest';
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
      this.tempName = this.getDisplayName(user);
      this.isEditingName = true;
    });
  }

  openTeamAndAchievementsModal() {
    this.authService.user$.pipe(take(1)).subscribe((user) => {
      this.tempName = this.getDisplayName(user);
    });
    this.showStickerAlbumModal = true;
  }

  openTeamModal() {
    this.openTeamAndAchievementsModal();
  }

  saveTeamNameFromModal() {
    this.onSaveName(this.tempName);
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
  showSideCards = false;

  @HostListener('window:resize')
  onResize() {
    this.checkOrientation();
  }

  checkOrientation() {
    const aspectRatio = window.innerWidth / window.innerHeight;
    if (aspectRatio < 0.5) {
      this.cols = 4;
    } else if (aspectRatio < 1.0) {
      this.cols = 5;
    } else if (aspectRatio < 2.4) {
      this.cols = 8;
    } else {
      this.cols = 10;
    }
    const parcelCount = this.parcels.length || 40;
    this.rows = Math.ceil(parcelCount / this.cols);

    const availHeight = Math.max(200, window.innerHeight - 128);
    const gridPad = Math.min(10, Math.max(6, window.innerWidth * 0.008));
    const gridGap = 4;
    const cellSize = (availHeight - 2 * gridPad - (this.rows - 1) * gridGap) / this.rows;
    const fullHeightGridWidth = cellSize * this.cols + (this.cols - 1) * gridGap + 2 * gridPad;
    const remainingWidth = window.innerWidth - fullHeightGridWidth - 48;
    this.showSideCards = this.cols >= 8 && remainingWidth >= 290;
  }

  // --- Touch Events ---

  // Prevent default scroll when touching the grid
  onTouchStart(event: TouchEvent) {
    if (this.isReadOnly || this.showFinance) return;
    if (event.cancelable) event.preventDefault();

    this.isDragging = true;
    if (!event.metaKey && !event.shiftKey) {
      this.selectedIndices.clear();
    }
    const index = this.getParcelIndexFromTouch(event.touches[0]);
    if (index !== -1) {
      this.dragStartIndex = index;
      this.updateSelection(index);
    } else {
      this.dragStartIndex = null;
    }
  }

  onTouchMove(event: TouchEvent) {
    if (!this.isDragging) return;
    if (event.cancelable) event.preventDefault();

    const index = this.getParcelIndexFromTouch(event.touches[0]);
    if (index !== -1) {
      if (this.dragStartIndex === null) {
        this.dragStartIndex = index;
      }
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
    const parcelElement = element?.closest('app-parcel');
    if (!parcelElement) return -1;

    const indexStr = parcelElement.getAttribute('data-index');
    return indexStr ? parseInt(indexStr, 10) : -1;
  }

  onBoardAreaMouseDown(event: MouseEvent) {
    if (this.isReadOnly || this.showFinance || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, select, textarea, [role="dialog"]')) {
      return;
    }
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
      this.selectedIndices.clear();
    }
    this.isDragging = true;
    this.dragStartIndex = null;
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
    event.stopPropagation();
  }

  onMouseEnter(index: number) {
    if (this.isDragging) {
      if (this.dragStartIndex === null) {
        this.dragStartIndex = index;
      }
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
        this.syncCollectedStickers(round.result?.unlockedStickers);

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
    this.activeHudPopover = null;
    this.showContractPopover = false;
    if (this.selectedIndices.size > 0 && !this.showPlantingModal) {
      this.selectedIndices.clear();
    }
  }

  get backgroundImage(): string {
    if (this.showFinance) {
      const orientation = this.cols <= 5 ? 'portrait' : 'landscape';
      return `assets/images/bauernhof-${orientation}-dunkel.webp`;
    }

    const round = this.history.find((r) => r.number === this.viewingRound);
    const weather = (round?.result?.events?.weather || 'Normal') as keyof typeof GAME_CONSTANTS.WEATHER_EFFECTS;

    const weatherMap: Record<string, string> = {
      Normal: '',
      Drought: '-trockenheit',
      HeatWave: '-hitzewelle',
      LateFrost: '-spaetfrost', // Matching the filename "spaetfrost" from ls output
      Flood: '-hochwasser',
      Storm: '-sturm',
    };

    const suffix = weatherMap[weather] || '';
    const orientation = this.cols <= 5 ? 'portrait' : 'landscape';

    return `assets/images/bauernhof-${orientation}${suffix}-hd.webp`;
  }

  closeRoundResultModal() {
    this.showRoundResultModal = false;
  }

  getPreviousRound(roundNumber: number): Round | undefined {
    return this.history.find((r) => r.number === roundNumber - 1);
  }

  get selectedRoundWeatherData(): { icon: string; name: string; image: string } {
    const round = this.history.find((r) => r.number === this.viewingRound);
    const weather = (round?.result?.events?.weather || 'Normal') as keyof typeof GAME_CONSTANTS.WEATHER_EFFECTS;
    const icons: Record<string, string> = {
      Normal: '☀️',
      Drought: '🏜️',
      LateFrost: '❄️',
      HeatWave: '🔥',
      Flood: '🌊',
      Storm: '💨',
    };

    return {
      icon: icons[weather] || '☀️',
      name: GAME_CONSTANTS.WEATHER_EFFECTS[weather]?.name || weather,
      image: this.getWeatherImage(weather as string),
    };
  }

  getWeatherImage(weatherType?: string): string {
    const weatherMap: Record<string, string> = {
      Normal: 'assets/images/weather/normal.jpg',
      Drought: 'assets/images/weather/drought.jpg',
      HeatWave: 'assets/images/weather/heatwave.jpg',
      LateFrost: 'assets/images/weather/late-frost.jpg',
      Flood: 'assets/images/weather/flood.jpg',
      Storm: 'assets/images/weather/storm.jpg',
    };
    return (weatherType && weatherMap[weatherType]) || 'assets/images/weather/normal.jpg';
  }

  getForecastWeatherImage(forecast?: WeatherForecast | null): string {
    const primary = forecast?.likelyWeathers?.[0] || 'Normal';
    return this.getWeatherImage(primary);
  }

  getContractImage(contractId?: string): string {
    const imageMap: Record<string, string> = {
      'legume-initiative': 'assets/images/contracts/legume-initiative.jpg',
      'humus-steward': 'assets/images/contracts/humus-steward.jpg',
      'regional-grain': 'assets/images/contracts/regional-grain.jpg',
      'eco-pioneer': 'assets/images/contracts/eco-pioneer.jpg',
    };
    return (contractId && imageMap[contractId]) || 'assets/images/contracts/legume-initiative.jpg';
  }

  get selectedRoundPestsData(): { icon: string; name: string; image: string; targetLabel: string }[] {
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
      'swine-fever': '🐖',
    };

    const imageMap: Record<string, string> = {
      'potato-beetle': 'assets/images/pests/potato-beetle.jpg',
      'corn-borer': 'assets/images/pests/caterpillar-beetle.jpg',
      'aphid-black': 'assets/images/pests/aphid.jpg',
      'aphid-cereal': 'assets/images/pests/aphid.jpg',
      'pollen-beetle': 'assets/images/pests/caterpillar-beetle.jpg',
      nematode: 'assets/images/pests/soil-fungus.jpg',
      'pea-moth': 'assets/images/pests/caterpillar-beetle.jpg',
      'oat-rust': 'assets/images/pests/soil-fungus.jpg',
      'swine-fever': 'assets/images/hausschwein.webp',
    };

    const targetMap: Record<string, string> = {
      'potato-beetle': 'Kartoffel',
      'corn-borer': 'Mais',
      'aphid-black': 'Ackerbohne',
      'aphid-cereal': 'Weizen, Gerste, Roggen',
      'pollen-beetle': 'Raps',
      nematode: 'Zuckerrübe',
      'pea-moth': 'Erbse',
      'oat-rust': 'Hafer',
      'swine-fever': 'Tierhaltung',
    };

    return pests.map((p) => ({
      name: GAME_CONSTANTS.VERMIN_EFFECTS[p as keyof typeof GAME_CONSTANTS.VERMIN_EFFECTS]?.name || p,
      icon: iconMap[p] || '🐛',
      image: imageMap[p] || 'assets/images/pests/none.jpg',
      targetLabel: targetMap[p] || 'Ackerbau',
    }));
  }

  get primaryPestBannerImage(): string {
    const pests = this.selectedRoundPestsData;
    return pests.length > 0 ? pests[0].image : 'assets/images/pests/none.jpg';
  }

  calculateWinners(game: Game) {
    if (!game.players) return;
    const playerList = Object.values(game.players);
    if (playerList.length === 0) return;

    const getPlayerName = (p: PlayerState) =>
      p.displayName || `${this.playerLabel} ${p.uid.startsWith('player-') ? p.uid.split('-')[2] : ''}`;

    // Overall Sustainability Winner (Primary)
    let bestOverall = playerList[0];
    let bestScore = -Infinity;
    let bestOverallSoil = 100;

    playerList.forEach((p) => {
      const cap = p.capital ?? 0;
      const soil = Math.round(this.calculateAvgSoil(p));
      const score = p.sustainabilityScore ?? GameEngine.calculateSustainabilityScore(cap, soil);
      if (score > bestScore || (score === bestScore && cap > (bestOverall.capital ?? 0))) {
        bestScore = score;
        bestOverall = p;
        bestOverallSoil = soil;
      }
    });

    this.overallWinner = {
      name: getPlayerName(bestOverall),
      score: bestScore === -Infinity ? 0 : bestScore,
      capital: bestOverall.capital || 0,
      avgSoil: bestOverallSoil,
    };

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

    this.finalStandings = this.getRoundLeaderboard(game.currentRoundNumber);
  }

  private calculateAvgSoil(player: PlayerState): number {
    if (typeof player.avgSoil === 'number') return player.avgSoil;
    const history = player.history || [];
    if (history.length === 0) return 100;
    const lastRound = history[history.length - 1];
    if (typeof lastRound.avgSoil === 'number') return lastRound.avgSoil;
    const parcels = lastRound.parcelsSnapshot || [];
    if (parcels.length === 0) return 100;
    const totalSoil = parcels.reduce((sum: number, p: ParcelType) => sum + (p.soil || 0), 0);
    return totalSoil / parcels.length;
  }

  get game(): Game | null {
    return this.gameService.state?.game || null;
  }

  scorecardCopied = false;

  get myFinalScore(): number {
    const ps = this.gameService.state?.playerState;
    if (ps) {
      const cap = ps.capital ?? 0;
      const soil = Math.round(this.calculateAvgSoil(ps));
      return ps.sustainabilityScore ?? GameEngine.calculateSustainabilityScore(cap, soil);
    }
    return this.overallWinner?.score ?? 0;
  }

  get myFinalAvgSoil(): number {
    const ps = this.gameService.state?.playerState;
    if (ps) return Math.round(this.calculateAvgSoil(ps));
    return this.overallWinner?.avgSoil ?? 100;
  }

  get myFinalCapital(): number {
    const ps = this.gameService.state?.playerState;
    if (ps) return Math.round(ps.capital ?? 0);
    return Math.round(this.overallWinner?.capital ?? 100000);
  }

  copyShareScorecard(): void {
    const seed = this.game?.config?.seed || 'STD';
    const difficulty = this.gameDifficulty;
    const rounds = this.game?.settings?.length || 10;
    const myScore = this.myFinalScore;
    const myName = this.gameService.state?.playerState?.displayName || this.overallWinner?.name || 'Hof 1';
    const formattedCapital = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(this.myFinalCapital);
    const shareUrl = `https://soil.app/?challenge=${encodeURIComponent(seed)}&difficulty=${encodeURIComponent(difficulty)}&rounds=${encodeURIComponent(rounds)}&targetScore=${encodeURIComponent(myScore)}&targetName=${encodeURIComponent(myName)}`;
    const shareText = `SOIL Hof-Bilanz (${rounds} Runden): ${myScore} Pkt | ${formattedCapital} | Ø ${this.myFinalAvgSoil}% Bodenqualität | ${this.collectedStickerIds.length}/${this.allStickers.length} Sticker.\nKannst du meinen Hof unter denselben Wetter- & Schädlingsbedingungen (Seed #${seed}) schlagen?\n${shareUrl}`;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        this.scorecardCopied = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.scorecardCopied = false;
          this.cdr.detectChanges();
        }, 3000);
      });
    }
  }

  get gameDifficulty(): 'easy' | 'normal' | 'hard' {
    return this.game?.settings?.difficulty || 'normal';
  }

  get currentWeatherForecast(): WeatherForecast | null {
    const round =
      this.history.find((r) => r.number === this.viewingRound) ||
      this.history[this.history.length - 1] ||
      this.gameService.state?.lastRound;
    if (round?.weatherForecast) {
      return round.weatherForecast;
    }
    if (this.viewingRound === this.maxRoundNumber) {
      return {
        hintText: 'Ruhige Wetterlage erwartet.',
        likelyWeathers: ['Normal'],
        confidence: 'exact',
      };
    }
    return null;
  }

  getFormattedWeatherForecastText(hintText?: string): string {
    if (!hintText) {
      return 'Ruhige Wetterlage erwartet.';
    }
    const lower = hintText.toLowerCase();
    if (
      lower.includes('einführungswetter') ||
      lower.includes('ohne extremereignisse') ||
      lower.includes('normale witterung') ||
      lower.includes('ruhige wetterlage erwartet') ||
      lower === 'normal'
    ) {
      return 'Ruhige Wetterlage erwartet.';
    }
    const tendenzMatch = hintText.match(/deutet sich\s+(.+?)\s+an\.?$/i);
    if (tendenzMatch) {
      const cleaned = tendenzMatch[1].replace(/\bNormal\b/gi, 'Ruhige Wetterlage').trim();
      return `${cleaned} möglich.`;
    }
    const exactMatch = hintText.match(/Wetterbericht:\s*(.+?)\s+erwartet\.?$/i);
    if (exactMatch) {
      const cleaned = exactMatch[1].replace(/\bNormal\b/gi, 'Ruhige Wetterlage').trim();
      return `${cleaned} erwartet.`;
    }
    if (lower.includes('klimamodell')) {
      return 'Wechselhafte Wetterlage möglich.';
    }
    const formatted = hintText
      .replace(/Ruhiges Einführungswetter:?/gi, '')
      .replace(/Stabiles Einführungswetter:?/gi, '')
      .replace(/ohne Extremereignisse/gi, '')
      .replace(/\bNormal\b/g, 'Ruhige Wetterlage')
      .replace(/\s+/g, ' ')
      .trim();
    if (!formatted) {
      return 'Ruhige Wetterlage erwartet.';
    }
    return /[.!?]$/.test(formatted) ? formatted : `${formatted}.`;
  }

  get currentActiveContract(): RegionalContract | null {
    const targetRound = this.viewingRound === this.maxRoundNumber ? this.maxRoundNumber + 1 : this.viewingRound;
    if (targetRound < 2) {
      return null;
    }
    const timeScale = this.totalRounds > 0 ? GAME_CONSTANTS.DEFAULT_ROUNDS / this.totalRounds : 1;
    const scheduled = GameEngine.getActiveContract(targetRound, timeScale);
    if (scheduled) {
      return scheduled;
    }
    const round =
      this.history.find((r) => r.number === this.viewingRound) ||
      this.history[this.history.length - 1] ||
      this.gameService.state?.lastRound;
    return round?.activeContract ?? null;
  }

  getForecastConfidenceLabel(confidence?: 'exact' | 'tendency' | 'uncertain'): string {
    if (confidence === 'exact') return 'Exakt';
    if (confidence === 'tendency') return 'Trend';
    return 'Klima-Trend';
  }

  private extractRoundSnapshot(round: Round | undefined, uid: string): ParcelType[] | undefined {
    if (!round) return undefined;
    if (round.parcelsSnapshot?.length) return round.parcelsSnapshot;
    const resultsSnapshot = (round as unknown as { results?: Record<string, { parcelsSnapshot?: ParcelType[] }> })
      .results?.[uid]?.parcelsSnapshot;
    return resultsSnapshot?.length ? resultsSnapshot : undefined;
  }

  private resolveCurrentBaselineParcels(uid: string): ParcelType[] | undefined {
    const lastHist = this.history.length > 0 ? this.history[this.history.length - 1] : undefined;
    const fromHist = this.extractRoundSnapshot(lastHist, uid);
    if (fromHist) return fromHist;
    const lastRoundSnapshot = this.gameService.state?.lastRound?.parcelsSnapshot;
    return lastRoundSnapshot?.length ? lastRoundSnapshot : undefined;
  }

  getPreviousCropForParcel(index: number): CropType | undefined {
    const uid = this.gameService.state?.playerState?.uid || '';
    const isPlanningCurrentRound =
      this.viewingRound === this.maxRoundNumber &&
      !this.isReadOnly &&
      (this.gameService.hasPendingParcelDecisions() || this.maxRoundNumber === 0);

    if (isPlanningCurrentRound) {
      return this.resolveCurrentBaselineParcels(uid)?.[index]?.crop;
    }

    if (this.viewingRound <= 0) return undefined;
    const prevRound = this.getPreviousRound(this.viewingRound);
    return this.extractRoundSnapshot(prevRound, uid)?.[index]?.crop;
  }

  getSelectedBaselineParcels(): ParcelType[] {
    if (this.selectedIndices.size === 0) return [];
    const uid = this.gameService.state?.playerState?.uid || '';
    const baseline = this.resolveCurrentBaselineParcels(uid) || this.parcels;

    const selected: ParcelType[] = [];
    this.selectedIndices.forEach((idx) => {
      if (baseline[idx]) {
        selected.push(baseline[idx]);
      }
    });
    return selected;
  }

  getRoundLeaderboard(targetRoundNumber?: number): LeaderboardEntry[] {
    const game = this.gameService.state?.game;
    if (!game?.players) return [];
    const players = Object.values(game.players);
    if (players.length === 0) return [];

    const currentUid = this.gameService.state?.playerState?.uid || '';
    const roundNum = targetRoundNumber ?? this.roundResultRound?.number ?? this.maxRoundNumber;

    const getPlayerName = (p: PlayerState) =>
      p.displayName || `${this.playerLabel} ${p.uid.startsWith('player-') ? p.uid.split('-')[2] : ''}`;

    const rawEntries = players.map((p) => {
      const pHistory = p.history || [];
      const currRound = pHistory.find((r) => r.number === roundNum) || pHistory[pHistory.length - 1];
      const prevRound = pHistory.find((r) => r.number === Math.max(0, roundNum - 1)) || pHistory[0];

      const capital = currRound?.result?.capital ?? p.capital ?? 100000;
      const avgSoil = Math.round(currRound?.avgSoil ?? this.calculateAvgSoil(p));
      const score =
        currRound?.result?.sustainabilityScore ??
        p.sustainabilityScore ??
        GameEngine.calculateSustainabilityScore(capital, avgSoil);

      const prevCapital = prevRound?.result?.capital ?? 100000;
      const prevAvgSoil = Math.round(prevRound?.avgSoil ?? 100);
      const prevScore =
        prevRound?.result?.sustainabilityScore ?? GameEngine.calculateSustainabilityScore(prevCapital, prevAvgSoil);

      return {
        uid: p.uid,
        name: getPlayerName(p),
        isAi: p.isAi,
        score,
        prevScore,
        capital,
        avgSoil,
        isCurrentPlayer: p.uid === currentUid,
      };
    });

    const prevSorted = [...rawEntries].sort((a, b) => b.prevScore - a.prevScore || a.uid.localeCompare(b.uid));
    const prevRankMap = new Map<string, number>();
    prevSorted.forEach((e, idx) => {
      prevRankMap.set(e.uid, idx + 1);
    });

    const currSorted = [...rawEntries].sort(
      (a, b) => b.score - a.score || b.capital - a.capital || a.uid.localeCompare(b.uid),
    );

    return currSorted.map((entry, idx) => {
      const rank = idx + 1;
      const prevRank = prevRankMap.get(entry.uid) ?? rank;
      return {
        ...entry,
        rank,
        prevRank,
        rankDelta: roundNum > 0 ? prevRank - rank : 0,
      };
    });
  }

  syncCollectedStickers(extraStickerIds?: string[]) {
    try {
      const storedRaw = typeof window !== 'undefined' ? window.localStorage?.getItem('soil_collected_stickers') : null;
      const stored: string[] = storedRaw ? JSON.parse(storedRaw) : [];
      const fromHistory = (this.history || []).flatMap((r) => r.result?.unlockedStickers || []);
      const fromPlayer = this.gameService.state?.playerState?.unlockedStickers || [];
      const merged = Array.from(
        new Set([...stored, ...fromHistory, ...fromPlayer, ...(extraStickerIds || [])].filter(Boolean)),
      );
      this.collectedStickerIds = merged;
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('soil_collected_stickers', JSON.stringify(merged));
      }
    } catch {
      // Fallback if localStorage is unavailable or invalid
      this.collectedStickerIds = Array.from(new Set(extraStickerIds || []));
    }
  }

  isStickerCollected(stickerId: string): boolean {
    return this.collectedStickerIds.includes(stickerId);
  }

  getStickerCategoryLabel(category: CollectibleSticker['category']): string {
    const labels: Record<CollectibleSticker['category'], string> = {
      soil: 'Boden',
      economy: 'Ökonomie',
      resilience: 'Resilienz',
      mastery: 'Meisterschaft',
    };
    return labels[category] || category;
  }

  closeGameEndModal() {
    this.showGameEndModal = false;
  }
}
