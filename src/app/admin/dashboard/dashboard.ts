import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, NgZone, type OnDestroy, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { Subscription } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import type { Game, PlayerState, UserStatus } from '../../types';
import { FeedbackModal } from '../components/feedback-modal/feedback-modal';
import { DashboardCreateGameComponent } from './components/dashboard-create-game';
import { DashboardDeleteModalComponent } from './components/dashboard-delete-modal';
import { DashboardErrorModalComponent } from './components/dashboard-error-modal';
import { DashboardFinanceModalComponent } from './components/dashboard-finance-modal';
import { DashboardGameListComponent } from './components/dashboard-game-list';
import { DashboardHudComponent } from './components/dashboard-hud';
import { DashboardJoinGameComponent } from './components/dashboard-join-game';
import { DashboardSuperAdminComponent } from './components/dashboard-super-admin';
import { DashboardTeacherGuideComponent } from './components/dashboard-teacher-guide';
import { QrOverlayComponent } from './components/qr-overlay';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DashboardHudComponent,
    DashboardErrorModalComponent,
    QrOverlayComponent,
    DashboardSuperAdminComponent,
    DashboardCreateGameComponent,
    DashboardJoinGameComponent,
    DashboardGameListComponent,
    DashboardDeleteModalComponent,
    DashboardFinanceModalComponent,
    DashboardTeacherGuideComponent,
    FeedbackModal,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  t(key: string): string {
    const translations: Record<string, string> = {
      'dashboard.title': 'Dashboard für Lehrkräfte',
      'dashboard.logout': 'Abmelden',
      'dashboard.loading.verifying': 'Konto-Status wird geprüft...',
      'dashboard.loading.games': 'Spiele werden geladen...',
      'dashboard.super.title': 'Super-Admin-Zugriff',
      'dashboard.super.redirect': 'Weiterleitung zur Super-Admin-Konsole...',
      'dashboard.super.btnGo': 'Zur Konsole',
      'dashboard.controls.title': 'Konfiguration',
      'dashboard.createGame.title': 'Neues Spiel erstellen',
      'dashboard.createGame.name': 'Spielname',
      'dashboard.createGame.phName': 'Spielname',
      'dashboard.createGame.playerLabel': 'Spieler-Bezeichnung (z. B. Team, Farmer)',
      'dashboard.createGame.phPlayer': 'Spieler',
      'dashboard.createGame.players': 'Spieler (1-50)',
      'dashboard.createGame.rounds': 'Runden',
      'dashboard.createGame.bots': 'KI-Bots',
      'dashboard.createGame.aiLevel': 'KI-Niveau',
      'dashboard.createGame.submit': '+ Neues Spiel erstellen',
      'dashboard.createGame.creating': 'Wird erstellt...',
      'dashboard.created.title': 'Spiel erstellt!',
      'dashboard.created.id': 'Spiel-ID',
      'dashboard.list.trash': 'Papierkorb (Gelöschte Spiele)',
      'dashboard.list.active': 'Aktive Spiele',
      'dashboard.list.refresh': 'Liste aktualisieren',
      'dashboard.filter.active': 'Aktiv',
      'dashboard.filter.trash': 'Papierkorb',
      'dashboard.actions.restoreSelected': 'Ausgewählte wiederherstellen',
      'dashboard.actions.deleteSelected': 'Ausgewählte löschen',
      'dashboard.error.retry': 'Erneut versuchen',
      'dashboard.error.title': 'Fehler',
      'dashboard.error.close': 'Schließen',
      'dashboard.table.name': 'Name',
      'dashboard.table.details': 'Details',
      'dashboard.table.round': 'Runde',
      'dashboard.table.deletedAt': 'Gelöscht am',
      'dashboard.table.created': 'Erstellt',
      'dashboard.table.actions': 'Aktionen',
      'dashboard.table.id': 'Spiel ID: ',
      'dashboard.table.email': 'Spieldetails senden',
      'dashboard.table.restore': 'Spiel wiederherstellen',
      'dashboard.table.delete': 'Spiel löschen',
      'dashboard.details.players': 'Spieler',
      'dashboard.details.noPlayers': 'Noch keine Spieler beigetreten.',
      'dashboard.deadline.title': 'Runden-Frist-Manager',
      'dashboard.deadline.round': 'Rundenfrist',
      'dashboard.deadline.set': 'Frist setzen',
      'dashboard.deadline.hint':
        '* Wenn eine Frist gesetzt ist, übernimmt die KI automatisch für alle Spieler, die bis dahin nicht abgegeben haben.',
      'dashboard.player.label': 'Spieler',
      'dashboard.player.capital': 'Kapital',
      'dashboard.player.round': 'Runde',
      'dashboard.player.soil': 'Bodenqualität (ø)',
      'dashboard.player.nutrition': 'Nährstoffe (ø)',
      'dashboard.player.submitted': 'Abgegeben?',
      'dashboard.player.toHuman': 'ZU MENSCH',
      'dashboard.player.toAi': 'ZU KI',
      'dashboard.player.login': 'LOGIN',
      'dashboard.player.copyUrl': 'URL KOPIEREN',
      'dashboard.player.printAll': 'ALLE QR-CODES DRUCKEN',
      'dashboard.empty.title': 'Keine Spiele gefunden.',
      'dashboard.empty.subtitle': 'Erstelle ein neues Spiel, um zu beginnen!',
      'dashboard.pagination.showing': 'Zeige',
      'dashboard.pagination.of': 'von',
      'dashboard.pagination.prev': 'Zurück',
      'dashboard.pagination.page': 'Seite',
      'dashboard.pagination.next': 'Weiter',
      'dashboard.qr.access': 'Zugang',
      'dashboard.qr.scan': 'Scannen zum automatischen Anmelden.',
      'dashboard.qr.print': 'Drucken',
      'dashboard.qr.close': 'Schließen',
      'dashboard.delete.permanent': 'Dauerhaftes Löschen',
      'dashboard.delete.confirm': 'Löschen bestätigen',
      'dashboard.delete.questionPermanent': 'Soll',
      'dashboard.delete.question': 'Soll',
      'dashboard.delete.questionBatchPermanent': 'Sollen',
      'dashboard.delete.questionBatch': 'Sollen',
      'dashboard.delete.questionSuffix': 'wirklich gelöscht werden?',
      'dashboard.delete.questionPermanentSuffix': 'wirklich dauerhaft gelöscht werden?',
      'dashboard.delete.games': 'Spiel(e)',
      'dashboard.delete.soft.title': 'Papierkorb',
      'dashboard.delete.soft.desc':
        'Spiele werden in den Papierkorb verschoben. Du kannst sie jederzeit wiederherstellen innerhalb von ',
      'dashboard.delete.days': 'Tagen',
      'dashboard.delete.warning': 'Achtung!',
      'dashboard.delete.permanentDesc':
        'Diese Aktion kann nicht rückgängig gemacht werden. Alle Spieldaten werden sofort zerstört.',
      'dashboard.delete.typeConfirm': 'Bitte gib <strong>DELETE</strong> ein, um das Löschen zu bestätigen:',
      'dashboard.delete.cancel': 'Abbrechen',
      'dashboard.delete.btnPermanent': 'Dauerhaft löschen',
      'dashboard.delete.btnGame': 'Spiel löschen',
      'dashboard.login.msg': 'Bitte melde dich an, um auf das Dashboard zuzugreifen.',
      'dashboard.login.btn': 'Anmelden mit Google',
      'ai.level.elementary': 'Unterstufe',
      'ai.level.middle': 'Mittelstufe',
      'ai.level.high': 'Oberstufe',
      'user.photoURL': 'assets/images/gut.jpg',
      'dashboard.adj.green': 'Grünes',
      'dashboard.adj.sunny': 'Sonniges',
      'dashboard.adj.golden': 'Goldenes',
      'dashboard.adj.misty': 'Nebeliges',
      'dashboard.adj.fertile': 'Fruchtbares',
      'dashboard.adj.quiet': 'Stilles',
      'dashboard.adj.wild': 'Wildes',
      'dashboard.noun.valley': 'Tal',
      'dashboard.noun.field': 'Feld',
      'dashboard.noun.meadow': 'Wiesental',
      'dashboard.noun.farm': 'Gut',
      'dashboard.noun.acre': 'Land',
      'dashboard.noun.grove': 'Hain',
      'dashboard.noun.orchard': 'Garten',
    };
    return translations[key] || key;
  }
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  user$ = this.authService.user$;
  userStatus: UserStatus | null = null; // Contains role and status
  private userStatusSub: Subscription | null = null;

  isLoading = true; // Initial loading state for auth check
  showFeedbackModal = false;

  onFeedbackClose() {
    this.showFeedbackModal = false;
  }

  async onFeedbackSubmit(feedback: {
    category: 'interface' | 'mechanics' | 'improvements' | 'suggestions' | 'documentation' | 'other';
    rating: number;
    comment: string;
  }) {
    try {
      await this.gameService.submitFeedback(feedback);
      this.showFeedbackModal = false;
      alert('Vielen Dank für dein Feedback!');
    } catch (e: unknown) {
      const error = e as Error;
      this.errorMessage = `Failed to submit feedback: ${error.message}`;
    }
  }

  login() {
    this.authService.loginWithGoogle();
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }

  createdGame: { id: string; password?: string } | null = null;
  games: Game[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalGames = 0;

  // Selection
  selectedGameIds = new Set<string>();

  newGameConfig = {
    name: '',
    numPlayers: 1,
    numRounds: 20,
    numAi: 0,
    playerLabel: 'Team',
    aiLevel: 'middle',
    advancedPricingEnabled: false,
    analyticsEnabled: true,
  };

  onPlayersChange() {
    if (this.newGameConfig.numAi > this.newGameConfig.numPlayers) {
      this.newGameConfig.numAi = this.newGameConfig.numPlayers;
    }
  }

  isCreatingGame = false;
  isDeleting = false;

  // Delete Modal
  gameToDelete: Game | null = null;
  isDeletingSelected = false;
  deleteConfirmInput = '';

  // Game Expansion
  expandedGameId: string | null = null;

  // Finance Modal
  showFinanceModal = false;
  selectedFinanceGame: Game | null = null;
  selectedFinancePlayer: PlayerState | null = null;

  closeFinance() {
    this.showFinanceModal = false;
    this.selectedFinanceGame = null;
    this.selectedFinancePlayer = null;
  }

  toggleExpand(gameId: string) {
    if (this.expandedGameId === gameId) {
      this.expandedGameId = null;
    } else {
      this.expandedGameId = gameId;
    }
  }

  getPlayerKeys(players: Record<string, PlayerState>): string[] {
    if (!players) return [];
    return Object.keys(players);
  }

  async ngOnInit() {
    this.newGameConfig.name = this.getRandomName();
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        // Reset state for new user
        this.userStatus = null;

        if (localStorage.getItem('soil_test_mode') === 'true') {
          this.ngZone.run(() => {
            const fullRole = localStorage.getItem('soil_test_role') || 'admin';
            const role = fullRole.startsWith('player') ? 'player' : fullRole;
            this.userStatus = { uid: user.uid, role: role as any, status: 'active', email: user.email || '' };

            if (role === 'superadmin') {
              this.router.navigate(['/admin/super']);
              return;
            }

            this.isLoading = false;
            this.loadGames();
            this.cdr.detectChanges();
          });
          return;
        }

        this.isLoading = true;
        this.errorMessage = null;

        if (user.isAnonymous) {
          this.userStatus = { uid: user.uid, role: 'player', status: 'active', email: '' };
          this.isLoading = false;
          this.loadGames();
          this.cdr.detectChanges();
          return;
        }

        // For non-anonymous users, fetch status
        const initialUserData = await this.gameService.getUserStatus();
        this.ngZone.run(() => {
          if (initialUserData) {
            this.userStatus = initialUserData;
            if (initialUserData.role === 'superadmin') {
              this.isLoading = false;
              this.router.navigate(['/admin/super']);
              return;
            }
            if (initialUserData.role === 'new') {
              this.isLoading = false;
              this.router.navigate(['/admin/register']);
              return;
            }
            this.isLoading = false;
            this.loadGames();
          } else {
            // Fallback for bootstrap Super Admin
            if (user.email === 'florian.feldhaus@gmail.com') {
              this.userStatus = { uid: user.uid, role: 'superadmin', status: 'active', email: user.email || '' };
              this.isLoading = false;
              this.router.navigate(['/admin/super']);
              return;
            }

            this.isLoading = false;
            this.router.navigate(['/admin/register']);
          }
          this.cdr.detectChanges();
        });
      } else {
        this.isLoading = true;
        this.authService.signInAsGuest().catch((err) => {
          console.error('Auto guest login failed:', err);
          this.isLoading = false;
          this.router.navigate(['/admin/login']);
        });
      }
    });

    // Handle query params for notifications (e.g., from email links)
    this.route.params.subscribe((params) => {
      const gameId = params.gameId;
      if (gameId) {
        this.expandedGameId = gameId;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.userStatusSub) {
      this.userStatusSub.unsubscribe();
    }
  }

  // Loading State
  isLoadingGames = false;
  loadingError: string | null = null;
  errorMessage: string | null = null;

  loginAsPlayer(gameId: string, password: string) {
    const url = `${window.location.origin}/game-login?gameId=${gameId}&pin=${password}`;
    window.open(url, '_blank');
  }

  closeError() {
    this.errorMessage = null;
  }

  // Trash View
  showTrash = false;

  toggleTrashView() {
    this.showTrash = !this.showTrash;
    this.currentPage = 1;
    this.loadGames();
  }

  async loadGames(retryCount = 0) {
    this.isLoadingGames = true;
    this.loadingError = null;
    this.cdr.detectChanges(); // Ensure UI updates immediately

    try {
      const response = await this.gameService.getAdminGames(this.currentPage, this.pageSize, this.showTrash);
      this.ngZone.run(() => {
        this.games = response.games || [];
        this.totalGames = response.total;
        this.selectedGameIds.clear(); // Clear selection on page change or reload
        this.isLoadingGames = false;
        this.cdr.detectChanges();
      });
    } catch (e: unknown) {
      this.ngZone.run(async () => {
        console.error('Dashboard: Error loading games', e);
        const error = e as Error;

        if (error.message?.includes('deadline-exceeded') && retryCount < 1) {
          console.warn('Dashboard: Game listing timeout, retrying...');
          await new Promise((resolve) => setTimeout(resolve, 2000));
          this.loadGames(retryCount + 1);
          return;
        }

        this.loadingError = `Failed to load games: ${error.message || error}`;
        this.isLoadingGames = false;
        this.cdr.detectChanges();
      });
    }
  }

  get totalPages(): number {
    return Math.ceil(this.totalGames / this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadGames();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadGames();
    }
  }

  async onGameCreate(config: {
    name: string;
    numPlayers: number;
    numRounds: number;
    numAi: number;
    playerLabel: string;
    advancedPricingEnabled: boolean;
    analyticsEnabled: boolean;
  }) {
    this.newGameConfig = { ...this.newGameConfig, ...config };

    const numHumanPlayers = config.numPlayers - config.numAi;
    if (numHumanPlayers > 1 && this.authService.isAnonymous) {
      this.router.navigate(['/admin/login']);
      return;
    }

    await this.createNewGame();
  }

  async onJoinGame(event: { gameId: string; pin: string }) {
    try {
      await this.authService.loginAsPlayer(event.gameId, event.pin);
      this.router.navigate(['/game']);
    } catch (error: unknown) {
      console.error('Error joining game', error);
      this.errorMessage = `Failed to join game: ${(error as Error).message}`;
    }
  }

  async onUpdateDeadline(event: { gameId: string; round: number; dateStr: string }) {
    await this.updateDeadline(event.gameId, event.round, event.dateStr);
  }

  async createNewGame() {
    if (this.isCreatingGame) return;

    this.isCreatingGame = true;
    const name = this.newGameConfig.name || this.getRandomName();
    // Prepare config
    const config = {
      numPlayers: this.newGameConfig.numPlayers,
      numRounds: this.newGameConfig.numRounds,
      numAi: this.newGameConfig.numAi,
      playerLabel: this.newGameConfig.playerLabel,
      advancedPricingEnabled: this.newGameConfig.advancedPricingEnabled,
      analyticsEnabled: this.newGameConfig.analyticsEnabled,
    };

    try {
      const result = await this.gameService.createGame(name, config);
      this.createdGame = { id: result.gameId, password: result.password };

      const numHumanPlayers = config.numPlayers - (config.numAi || 0);
      if (numHumanPlayers === 1) {
        // Auto-join the created game as first player
        await this.authService.loginAsPlayer(result.gameId, result.password!);
        this.router.navigate(['/game']);
      }

      this.loadGames(); // Refresh list
      this.expandedGameId = result.gameId;
      this.cdr.detectChanges();
      this.newGameConfig.name = this.getRandomName(); // Reset with new random name
    } catch (error: unknown) {
      console.error('Error creating game', error);
      this.errorMessage = `Failed to create game: ${(error as Error).message}`;
    } finally {
      this.isCreatingGame = false;
      this.cdr.detectChanges();
    }
  }

  // --- Selection & Deletion ---

  toggleSelection(gameId: string) {
    if (this.selectedGameIds.has(gameId)) {
      this.selectedGameIds.delete(gameId);
    } else {
      this.selectedGameIds.add(gameId);
    }
  }

  toggleSelectAll(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      for (const g of this.games) {
        this.selectedGameIds.add(g.id);
      }
    } else {
      this.selectedGameIds.clear();
    }
  }

  isAllSelected(): boolean {
    return this.games.length > 0 && this.selectedGameIds.size === this.games.length;
  }

  isSelected(gameId: string): boolean {
    return this.selectedGameIds.has(gameId);
  }

  async deleteSelected() {
    if (this.selectedGameIds.size === 0) return;
    this.isDeletingSelected = true;
    this.deleteConfirmInput = '';
  }

  // Restore Logic
  isRestoring = false;

  async restoreSelected() {
    if (this.selectedGameIds.size === 0) return;
    this.isRestoring = true;
    try {
      await this.gameService.undeleteGames(Array.from(this.selectedGameIds));
      await this.loadGames();
    } catch (e: unknown) {
      this.errorMessage = `Failed to restore games: ${(e as Error).message}`;
    } finally {
      this.isRestoring = false;
    }
  }

  async restoreGame(game: Game) {
    try {
      await this.gameService.undeleteGames([game.id]);
      await this.loadGames();
    } catch (e: unknown) {
      this.errorMessage = `Failed to restore game: ${(e as Error).message}`;
    }
  }

  async deleteGame(game: Game) {
    this.gameToDelete = game;
    this.deleteConfirmInput = '';
  }

  cancelDelete() {
    this.gameToDelete = null;
    this.isDeletingSelected = false;
    this.deleteConfirmInput = '';
  }

  async confirmDelete(confirmInput?: string) {
    this.isDeleting = true;
    try {
      const force = this.showTrash;
      const finalInput = confirmInput ?? this.deleteConfirmInput;

      // Double check validation if forcing
      if (force && finalInput !== 'DELETE') {
        throw new Error('Please type DELETE to confirm.');
      }

      if (this.gameToDelete) {
        await this.gameService.deleteGames([this.gameToDelete.id], force);
      } else if (this.isDeletingSelected) {
        await this.gameService.deleteGames(Array.from(this.selectedGameIds), force);
      }
      await this.loadGames();
    } catch (e: unknown) {
      this.ngZone.run(() => {
        console.error('Error deleting games', e);
        this.errorMessage = `Failed to delete games: ${(e as Error).message}`;
      });
    } finally {
      this.ngZone.run(() => {
        this.isDeleting = false;
        this.gameToDelete = null;
        this.isDeletingSelected = false;
        this.deleteConfirmInput = '';
        this.cdr.detectChanges();
      });
    }
  }
  async shareGame(game: Game) {
    const url = `${window.location.origin}/game-login?gameId=${game.id}`;
    const text = `Join my SOIL game: ${game.name}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SOIL Game',
          text: text,
          url: url,
        });
        return;
      } catch (err) {
        console.error('Web Share failed, falling back to prompt:', err);
      }
    }

    const email = prompt(`Enter email address to send game details:`);
    if (!email) return;

    try {
      await this.gameService.sendGameInvite(game.id, email);
      alert('Invite sent successfully!');
    } catch (e: unknown) {
      this.errorMessage = `Failed to send invite: ${(e as Error).message}`;
    }
  }

  async sharePlayer(
    game: Game,
    slot: {
      number: number;
      uid: string;
      player: PlayerState | null;
      isJoined: boolean;
      isAi: boolean;
      password?: string;
    },
  ) {
    const url = `${window.location.origin}/game-login?gameId=${game.id}&pin=${slot.password}`;
    const text = `Log in to SOIL game "${game.name}" as Player ${slot.number}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SOIL Player Login',
          text: text,
          url: url,
        });
        return;
      } catch (err) {
        console.error('Web Share failed, falling back to prompt:', err);
      }
    }

    const email = prompt(`Enter email address for Player ${slot.number}:`);
    if (!email) return;

    try {
      await this.gameService.sendPlayerInvite(game.id, slot.number, email, window.location.origin);
      alert('Invite sent successfully!');
    } catch (e: unknown) {
      this.errorMessage = `Failed to send invite: ${(e as Error).message}`;
    }
  }

  getSlots(
    game: Game,
  ): { number: number; uid: string; player: PlayerState | null; isJoined: boolean; isAi: boolean; password: string }[] {
    const count = game.config?.numPlayers || 1;
    const slots = [];
    for (let i = 1; i <= count; i++) {
      const uid = `player-${game.id}-${i}`;
      const player = game.players ? game.players[uid] : null;

      // Get Password
      let password = '???';
      if (game.playerSecrets?.[String(i)]) {
        password = game.playerSecrets[String(i)].password;
      } else if (game.password) {
        password = game.password; // Fallback to global
      }

      slots.push({
        number: i,
        uid: uid,
        player: player,
        isJoined: !!player,
        isAi: player?.isAi || false,
        password: password,
      });
    }
    return slots;
  }

  async convertPlayer(game: Game, slot: { number: number; isAi: boolean }) {
    // If it's AI, convert to Human. If Human (or empty), convert to AI.
    // If empty: convert to AI means create AI player.
    // If empty: convert to Human means create Human placeholder? Or just set metadata?
    // Based on user request "Convert a Player to an AI Player or an AI Player to a Human Player".

    // Logic:
    // Target state:
    const targetType = slot.isAi ? 'human' : 'ai';
    const aiLevel = this.newGameConfig.aiLevel || 'middle';

    try {
      await this.gameService.updatePlayerType(game.id, slot.number, targetType, aiLevel);
      // Refresh games to show update
      await this.loadGames();
    } catch (e: unknown) {
      this.errorMessage = `Failed to convert player: ${(e as Error).message}`;
    }
  }

  // QR Code Logic
  qrCodeUrl = '';
  qrCodePlayer = '';
  allQrCodes: { name: string; url: string; qrData: string }[] = [];
  QRCode: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  async generateQrCode(gameId: string, playerNumber: number, password: string) {
    if (!this.QRCode) {
      const module = await import('qrcode-generator');
      this.QRCode = module.default || module;
    }
    const url = `${window.location.origin}/game-login?gameId=${gameId}&pin=${password}`;

    try {
      const typeNumber = 0; // auto detect
      const errorCorrectionLevel = 'L';
      const qr = this.QRCode(typeNumber, errorCorrectionLevel);
      qr.addData(url);
      qr.make();
      this.qrCodeUrl = qr.createDataURL(4);
      this.qrCodePlayer = `Player ${playerNumber}`;
    } catch (err) {
      console.error(err);
    }
  }

  async printAllQrCodes(game: Game) {
    if (!this.QRCode) {
      const module = await import('qrcode-generator');
      this.QRCode = module.default || module;
    }

    const slots = this.getSlots(game).filter((s) => !s.isAi);
    this.allQrCodes = [];

    for (const slot of slots) {
      const url = `${window.location.origin}/game-login?gameId=${game.id}&pin=${slot.password}`;
      const typeNumber = 0;
      const errorCorrectionLevel = 'L';
      const qr = this.QRCode(typeNumber, errorCorrectionLevel);
      qr.addData(url);
      qr.make();
      this.allQrCodes.push({
        name: `${game.settings?.playerLabel || 'Player'} ${slot.number}`,
        url: url,
        qrData: qr.createDataURL(4),
      });
    }

    // Small delay to let the DOM render before printing
    setTimeout(() => {
      window.print();
    }, 500);
  }

  closeAllQr() {
    this.allQrCodes = [];
  }

  closeQr() {
    this.qrCodeUrl = '';
  }

  // Round Deadlines
  isUpdatingDeadline = false;
  async updateDeadline(gameId: string, round: number, dateStr: string) {
    if (!dateStr) return;
    this.isUpdatingDeadline = true;
    try {
      await this.gameService.updateRoundDeadline(gameId, round, dateStr);
      await this.loadGames(); // Refresh
    } catch (e: unknown) {
      this.errorMessage = `Failed to update deadline: ${(e as Error).message}`;
    } finally {
      this.isUpdatingDeadline = false;
    }
  }

  getDeadlineForRound(game: Game, round: number): string {
    if (!game.roundDeadlines || !game.roundDeadlines[round]) return '';
    const d = game.roundDeadlines[round];
    const date = d && 'seconds' in d ? new Date(d.seconds * 1000) : new Date(d as unknown as string);

    // Format to YYYY-MM-DDTHH:mm
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      'T' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes())
    );
  }

  // Random Names
  private adjectives = ['green', 'sunny', 'golden', 'misty', 'fertile', 'quiet', 'wild'];
  private nouns = ['valley', 'field', 'meadow', 'farm', 'acre', 'grove', 'orchard'];

  getRandomName() {
    const adjKey = `dashboard.adj.${this.adjectives[Math.floor(Math.random() * this.adjectives.length)]}`;
    const nounKey = `dashboard.noun.${this.nouns[Math.floor(Math.random() * this.nouns.length)]}`;
    return `${this.t(adjKey)} ${this.t(nounKey)} ${Math.floor(Math.random() * 100)}`;
  }
}
