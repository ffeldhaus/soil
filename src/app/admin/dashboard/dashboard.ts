import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { doc, onSnapshot } from 'firebase/firestore';
import { Observable, Subscription } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { Finance } from '../../game/finance/finance';
import { GameService } from '../../game/game.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';
import { Game, UserStatus } from '../../types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, LanguageSwitcherComponent, Finance],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  t(key: string): string {
    return $localize`:@@${key}:${key}`;
  }
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private db = inject(Firestore);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  user$ = this.authService.user$;
  userStatus: UserStatus | null = null; // Contains role and status
  private userStatusSub: Subscription | null = null;

  isPendingApproval = false;
  isLoading = true; // Initial loading state for auth check

  login() {
    this.authService.loginWithGoogle();
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }

  createdGame: { id: string; password?: string } | null = null;
  games: any[] = [];

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
    playerLabel: 'Player',
    aiLevel: 'middle' as 'elementary' | 'middle' | 'high',
  };

  onPlayersChange() {
    if (this.newGameConfig.numAi > this.newGameConfig.numPlayers) {
      this.newGameConfig.numAi = this.newGameConfig.numPlayers;
    }
  }

  isCreatingGame = false;
  isDeleting = false;

  // Delete Modal
  gameToDelete: any = null;
  isDeletingSelected = false;
  deleteConfirmInput = '';

  // Game Expansion
  expandedGameId: string | null = null;

  // Finance Modal
  showFinanceModal = false;
  selectedFinanceGame: any = null;
  selectedFinancePlayer: any = null;

  openFinance(game: any, slot: any) {
    this.selectedFinanceGame = game;
    this.selectedFinancePlayer = slot.player;
    this.showFinanceModal = true;
  }

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

  getPlayerKeys(players: any): string[] {
    if (!players) return [];
    return Object.keys(players);
  }

  async ngOnInit() {
    this.newGameConfig.name = this.getRandomName();
    this.authService.user$.subscribe(async (user) => {
      console.log('Dashboard: Auth User emitted:', user?.uid);
      if (user) {
        // Prevent redirect loop if we are just starting to impersonate
        if (localStorage.getItem('soil_admin_impersonating')) {
          return;
        }

        if (localStorage.getItem('soil_test_mode') === 'true') {
          console.log('Dashboard: Test Mode Active. Forcing Admin status.');
          this.ngZone.run(() => {
            this.userStatus = { role: 'admin', status: 'active' } as any;
            this.isPendingApproval = false;
            this.isLoading = false;
            this.loadGames();
            this.cdr.detectChanges();
          });
          return;
        }

        this.isLoading = true;
        this.errorMessage = null;

        // Safety Timeout
        const timeoutId = setTimeout(() => {
          if (this.isLoading) {
            console.error('Dashboard: Timed out waiting for user status.');
            this.ngZone.run(() => {
              this.isLoading = false;
              this.errorMessage = 'Connection timed out. Please check your internet or try refreshing.';
              this.cdr.detectChanges();
            });
          }
        }, 10000); // 10 seconds

        try {
          console.log('Dashboard: AuthService user:', user.uid);
          console.log('Dashboard: Firestore instance:', this.db);

          const userRef = doc(this.db as any, 'users', user.uid);

          const statusObservable = new Observable<any>((observer) => {
            const unsubscribe = onSnapshot(
              userRef,
              { includeMetadataChanges: true },
              (snapshot) => {
                observer.next(snapshot.data());
              },
              (error) => {
                observer.error(error);
              },
            );
            return () => unsubscribe();
          });

          this.userStatusSub = statusObservable.subscribe(
            (userData: any) => {
              clearTimeout(timeoutId); // Clear timeout on first response
              this.ngZone.run(() => {
                if (userData) {
                  this.userStatus = userData;
                  console.log('Dashboard: User Status Updated:', this.userStatus);

                  if (userData.role === 'new') {
                    this.isLoading = false;
                    this.router.navigate(['/admin/register']);
                    return;
                  }

                  if (userData.role === 'superadmin') {
                    this.isLoading = false;
                    this.router
                      .navigate(['/admin/super'])
                      .then((success) => {
                        console.log('Dashboard: Navigation result:', success);
                        if (!success) {
                          console.error('Dashboard: Navigation failed!');
                        }
                      })
                      .catch((err) => console.error('Dashboard: Navigation error:', err));
                    return;
                  }

                  if (userData.role === 'pending' || userData.status === 'pending') {
                    this.isPendingApproval = true;
                    this.isLoading = false;
                  } else {
                    this.isPendingApproval = false;
                    this.isLoading = false;
                    this.loadGames();
                  }
                } else {
                  console.warn('Dashboard: User document not found for UID:', user.uid);

                  // Fallback for bootstrap Super Admin (matches backend logic)
                  if (user.email === 'florian.feldhaus@gmail.com') {
                    console.log('Dashboard: Detected Bootstrap Super Admin email. Forcing Super Admin status.');
                    this.userStatus = { role: 'superadmin', status: 'active' } as any;
                    this.isLoading = false;
                    this.router.navigate(['/admin/super']);
                    return;
                  }

                  if (localStorage.getItem('soil_test_mode') === 'true') {
                    console.log('Dashboard: Test Mode Active. Forcing Admin status.');
                    this.userStatus = { role: 'admin', status: 'active' } as any;
                    this.isPendingApproval = false;
                    this.isLoading = false;
                    this.loadGames();
                    this.cdr.detectChanges();
                    return;
                  }

                  this.isPendingApproval = true;
                  this.isLoading = false;
                }
                this.cdr.detectChanges();
              });
            },
            (error) => {
              clearTimeout(timeoutId);
              this.ngZone.run(() => {
                console.error('Dashboard: Subscription error:', error);
                this.errorMessage = 'Error loading account status: ' + (error.message || error);
                this.isLoading = false;
                this.cdr.detectChanges();
              });
            },
          );
        } catch (e: any) {
          clearTimeout(timeoutId);
          console.error('Dashboard: Sync Error:', e);
          this.errorMessage = 'Critical Error: ' + e.message;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      } else {
        console.log('Dashboard: No user, redirecting to login');
        this.games = [];
        this.userStatus = null;
        this.isLoading = false;
        this.router.navigate(['/admin/login']);
      }
    });

    // Handle query params for notifications (e.g., from email links)
    this.route.queryParams.subscribe((params) => {
      // Example: if a gameId is passed, maybe auto-expand it or highlight
      const gameId = params['gameId'];
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

  async impersonate(uid: string) {
    if (!uid) return;
    try {
      await this.authService.impersonate(uid);
      this.router.navigate(['/game']);
    } catch (e: any) {
      console.error(e);
      this.errorMessage = 'Impersonation failed: ' + e.message;
    }
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

  async loadGames() {
    console.log('Dashboard: loadGames called');
    this.isLoadingGames = true;
    this.loadingError = null;
    this.cdr.detectChanges(); // Ensure UI updates immediately

    try {
      const response = await this.gameService.getAdminGames(this.currentPage, this.pageSize, this.showTrash);
      this.ngZone.run(() => {
        console.log('Dashboard: Games loaded:', response.games?.length, 'Total:', response.total);
        this.games = response.games || [];
        this.totalGames = response.total;
        this.selectedGameIds.clear(); // Clear selection on page change or reload
        this.isLoadingGames = false;
        this.cdr.detectChanges();
      });
    } catch (e: any) {
      this.ngZone.run(() => {
        console.error('Dashboard: Error loading games', e);
        this.loadingError = 'Failed to load games: ' + (e.message || e);
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
    };

    try {
      const result = await this.gameService.createGame(name, config);
      this.createdGame = { id: result.gameId, password: result.password };
      // alert('Game created successfully!'); // Removed per request
      this.loadGames(); // Refresh list
      this.expandedGameId = result.gameId;
      this.cdr.detectChanges();
      this.newGameConfig.name = this.getRandomName(); // Reset with new random name
    } catch (error: any) {
      console.error('Error creating game', error);
      this.errorMessage = 'Failed to create game: ' + error.message;
    } finally {
      this.isCreatingGame = false;
      this.cdr.detectChanges();
      console.log('Create Game finished. isCreatingGame:', this.isCreatingGame);
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

  toggleSelectAll(event: any) {
    if (event.target.checked) {
      this.games.forEach((g) => this.selectedGameIds.add(g.id));
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
    } catch (e: any) {
      this.errorMessage = 'Failed to restore games: ' + e.message;
    } finally {
      this.isRestoring = false;
    }
  }

  async restoreGame(game: any) {
    try {
      await this.gameService.undeleteGames([game.id]);
      await this.loadGames();
    } catch (e: any) {
      this.errorMessage = 'Failed to restore game: ' + e.message;
    }
  }

  async deleteGame(game: any) {
    this.gameToDelete = game;
    this.deleteConfirmInput = '';
  }

  cancelDelete() {
    this.gameToDelete = null;
    this.isDeletingSelected = false;
    this.deleteConfirmInput = '';
  }

  async confirmDelete() {
    this.isDeleting = true;
    try {
      const force = this.showTrash;

      // Double check validation if forcing
      if (force && this.deleteConfirmInput !== 'DELETE') {
        throw new Error('Please type DELETE to confirm.');
      }

      if (this.gameToDelete) {
        await this.gameService.deleteGames([this.gameToDelete.id], force);
      } else if (this.isDeletingSelected) {
        await this.gameService.deleteGames(Array.from(this.selectedGameIds), force);
      }
      await this.loadGames();
    } catch (e: any) {
      this.ngZone.run(() => {
        console.error('Error deleting games', e);
        this.errorMessage = 'Failed to delete games: ' + e.message;
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

  shareGame(game: any) {
    const subject = encodeURIComponent(`Join my Soil Game: ${game.name} `);
    const body = encodeURIComponent(
      `You have been invited to play Soil!\n\n` +
        `Game ID: ${game.id} \n\n` +
        `Please ask the host for your unique Player PIN.\n` +
        `Go to ${window.location.origin}/ to join.`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  sharePlayer(game: any, slot: any) {
    const subject = encodeURIComponent(`Join Soil Game: ${game.name} (Player ${slot.number})`);
    const body = encodeURIComponent(
      `You are invited to play as Player ${slot.number}!\n\n` +
        `Game ID: ${game.id}\n` +
        `Your PIN: ${slot.password}\n\n` +
        `Join here: ${window.location.origin}/game?gameId=${game.id}&player=${slot.number}&pin=${slot.password}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  getSlots(game: any): any[] {
    const count = game.config?.numPlayers || 1;
    const slots = [];
    for (let i = 1; i <= count; i++) {
      const uid = `player-${game.id}-${i}`;
      const player = game.players ? game.players[uid] : null;

      // Get Password
      let password = '???';
      if (game.playerSecrets && game.playerSecrets[String(i)]) {
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

  async convertPlayer(game: any, slot: any) {
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
    } catch (e: any) {
      this.errorMessage = 'Failed to convert player: ' + e.message;
    }
  }

  // QR Code Logic
  qrCodeUrl = '';
  qrCodePlayer = '';
  QRCode: any;

  async generateQrCode(gameId: string, playerNumber: number, password: string) {
    if (!this.QRCode) {
      const module = await import('qrcode');
      this.QRCode = module.default || module;
    }
    // URL format: https://domain/game?id=...&player=...&pin=... ??
    // Or just a JSON blob? User said "automatically log in the player".
    // So likely a URL that the app handles.
    // For now: https://soil-602ea.web.app/join?gameId=...&player=...&pin=...
    // I need to implement the route or handle query params in Board.
    const url = `${window.location.origin}/game-login?gameId=${gameId}&pin=${password}`;

    try {
      this.qrCodeUrl = await this.QRCode.toDataURL(url);
      this.qrCodePlayer = `Player ${playerNumber}`;
    } catch (err) {
      console.error(err);
    }
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
    } catch (e: any) {
      this.errorMessage = 'Failed to update deadline: ' + e.message;
    } finally {
      this.isUpdatingDeadline = false;
    }
  }

  getDeadlineForRound(game: any, round: number): string {
    if (!game.roundDeadlines || !game.roundDeadlines[round]) return '';
    const d = game.roundDeadlines[round];
    // Convert Firestore timestamp or ISO string to local datetime-local format
    const date = d.seconds ? new Date(d.seconds * 1000) : new Date(d);

    // Format to YYYY-MM-DDTHH:mm
    const pad = (n: number) => (n < 10 ? '0' + n : n);
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
  private adjectives = ['Green', 'Sunny', 'Golden', 'Misty', 'Fertile', 'Quiet', 'Wild'];
  private nouns = ['Valley', 'Field', 'Meadow', 'Farm', 'Acre', 'Grove', 'Orchard'];

  getRandomName() {
    const adj = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
    const noun = this.nouns[Math.floor(Math.random() * this.nouns.length)];
    return `${adj} ${noun} ${Math.floor(Math.random() * 100)}`;
  }
}
