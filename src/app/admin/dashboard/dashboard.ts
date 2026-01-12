import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, NgZone, type OnDestroy, type OnInit } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { doc, onSnapshot } from 'firebase/firestore';
import { Observable, type Subscription } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import { LanguageService } from '../../services/language.service';
import type { Game, PlayerState, UserStatus } from '../../types';
import { FeedbackModal } from '../components/feedback-modal/feedback-modal';
import { DashboardCreateGameComponent } from './components/dashboard-create-game';
import { DashboardDeleteModalComponent } from './components/dashboard-delete-modal';
import { DashboardErrorModalComponent } from './components/dashboard-error-modal';
import { DashboardFinanceModalComponent } from './components/dashboard-finance-modal';
import { DashboardGameListComponent } from './components/dashboard-game-list';
import { DashboardHudComponent } from './components/dashboard-hud';
import { DashboardPendingComponent } from './components/dashboard-pending';
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
    DashboardPendingComponent,
    DashboardErrorModalComponent,
    QrOverlayComponent,
    DashboardSuperAdminComponent,
    DashboardCreateGameComponent,
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
      'dashboard.title': $localize`:Main Heading|Title of the teacher dashboard@@dashboard.title:Dashboard für Lehrkräfte`,
      'dashboard.pending.title': $localize`:Status Title|Title for account pending approval@@dashboard.pending.title:Konto wartet auf Genehmigung`,
      'dashboard.pending.message': $localize`:Status Message|Information about account approval process@@dashboard.pending.message:Ihr Konto wird derzeit von einem Super-Admin überprüft. Sie erhalten eine E-Mail, sobald Ihr Konto genehmigt wurde.`,
      'dashboard.logout': $localize`:Action Label|Logout button text@@dashboard.logout:Abmelden`,
      'dashboard.loading.verifying': $localize`:Loading State|Text shown while checking account status@@dashboard.loading.verifying:Konto-Status wird geprüft...`,
      'dashboard.loading.games': $localize`:Loading State|Text shown while loading the list of games@@dashboard.loading.games:Spiele werden geladen...`,
      'dashboard.super.title': $localize`:Heading|Title for super admin access section@@dashboard.super.title:Super-Admin-Zugriff`,
      'dashboard.super.redirect': $localize`:Info Message|Information about being redirected to super admin console@@dashboard.super.redirect:Weiterleitung zur Super-Admin-Konsole...`,
      'dashboard.super.btnGo': $localize`:Action Label|Button to go to the console@@dashboard.super.btnGo:Zur Konsole`,
      'dashboard.controls.title': $localize`:Subheading|Title for game configuration section@@dashboard.controls.title:Konfiguration`,
      'dashboard.createGame.title': $localize`:Heading|Title for the game creation form@@dashboard.createGame.title:Neues Spiel erstellen`,
      'dashboard.createGame.name': $localize`:Form Label|Label for the game name input@@dashboard.createGame.name:Spielname`,
      'dashboard.createGame.phName': $localize`:Form Placeholder|Placeholder for the game name input@@dashboard.createGame.phName:Spielname`,
      'dashboard.createGame.playerLabel': $localize`:Form Label|Label for the player designation input@@dashboard.createGame.playerLabel:Spieler-Bezeichnung (z. B. Team, Farmer)`,
      'dashboard.createGame.phPlayer': $localize`:Form Placeholder|Placeholder for the player designation input@@dashboard.createGame.phPlayer:Spieler`,
      'dashboard.createGame.players': $localize`:Form Label|Label for number of players input@@dashboard.createGame.players:Spieler (1-50)`,
      'dashboard.createGame.rounds': $localize`:Form Label|Label for number of rounds input@@dashboard.createGame.rounds:Runden`,
      'dashboard.createGame.bots': $localize`:Form Label|Label for number of AI bots input@@dashboard.createGame.bots:KI-Bots`,
      'dashboard.createGame.aiLevel': $localize`:Form Label|Label for AI difficulty level input@@dashboard.createGame.aiLevel:KI-Niveau`,
      'dashboard.createGame.submit': $localize`:Action Label|Button to create a new game@@dashboard.createGame.submit:+ Neues Spiel erstellen`,
      'dashboard.createGame.creating': $localize`:Loading State|Text shown while game is being created@@dashboard.createGame.creating:Wird erstellt...`,
      'dashboard.created.title': $localize`:Heading|Title shown when a game is successfully created@@dashboard.created.title:Spiel erstellt!`,
      'dashboard.created.id': $localize`:Field Label|Label for the game ID@@dashboard.created.id:Spiel-ID`,
      'dashboard.list.trash': $localize`:List Header|Title for the trash view of games@@dashboard.list.trash:Papierkorb (Gelöschte Spiele)`,
      'dashboard.list.active': $localize`:List Header|Title for the active games list@@dashboard.list.active:Aktive Spiele`,
      'dashboard.list.refresh': $localize`:Action Label|Button to refresh the games list@@dashboard.list.refresh:Liste aktualisieren`,
      'dashboard.filter.active': $localize`:Filter Label|Filter for active games@@dashboard.filter.active:Aktiv`,
      'dashboard.filter.trash': $localize`:Filter Label|Filter for games in trash@@dashboard.filter.trash:Papierkorb`,
      'dashboard.actions.restoreSelected': $localize`:Action Label|Button to restore selected games from trash@@dashboard.actions.restoreSelected:Ausgewählte wiederherstellen`,
      'dashboard.actions.deleteSelected': $localize`:Action Label|Button to delete selected games@@dashboard.actions.deleteSelected:Ausgewählte löschen`,
      'dashboard.error.retry': $localize`:Action Label|Button to retry an action after error@@dashboard.error.retry:Erneut versuchen`,
      'dashboard.error.title': $localize`:Heading|Title for error messages@@dashboard.error.title:Fehler`,
      'dashboard.error.close': $localize`:Action Label|Button to close error modal@@dashboard.error.close:Schließen`,
      'dashboard.table.name': $localize`:Column Header|Table header for game name@@dashboard.table.name:Name`,
      'dashboard.table.details': $localize`:Column Header|Table header for game details@@dashboard.table.details:Details`,
      'dashboard.table.round': $localize`:Column Header|Table header for current round@@dashboard.table.round:Runde`,
      'dashboard.table.deletedAt': $localize`:Column Header|Table header for deletion date@@dashboard.table.deletedAt:Gelöscht am`,
      'dashboard.table.created': $localize`:Column Header|Table header for creation date@@dashboard.table.created:Erstellt`,
      'dashboard.table.actions': $localize`:Column Header|Table header for available actions@@dashboard.table.actions:Aktionen`,
      'dashboard.table.id': $localize`:Field Label|Prefix for game ID@@dashboard.table.id:ID:`,
      'dashboard.table.email': $localize`:Action Label|Action to send game details via email@@dashboard.table.email:Spieldetails senden`,
      'dashboard.table.restore': $localize`:Action Label|Action to restore a single game@@dashboard.table.restore:Spiel wiederherstellen`,
      'dashboard.table.delete': $localize`:Action Label|Action to delete a single game@@dashboard.table.delete:Spiel löschen`,
      'dashboard.details.players': $localize`:Field Label|Label for number of players@@dashboard.details.players:Spieler`,
      'dashboard.details.noPlayers': $localize`:Info Message|Shown when no players have joined yet@@dashboard.details.noPlayers:Noch keine Spieler beigetreten.`,
      'dashboard.deadline.title': $localize`:Heading|Title for the round deadline manager@@dashboard.deadline.title:Runden-Frist-Manager`,
      'dashboard.deadline.round': $localize`:Field Label|Label for round deadline input@@dashboard.deadline.round:Rundenfrist`,
      'dashboard.deadline.set': $localize`:Action Label|Button to set the deadline@@dashboard.deadline.set:Frist setzen`,
      'dashboard.deadline.hint': $localize`:Info Hint|Explanation about what happens when deadline is reached@@dashboard.deadline.hint:* Wenn eine Frist gesetzt ist, übernimmt die KI automatisch für alle Spieler, die bis dahin nicht abgegeben haben.`,
      'dashboard.player.label': $localize`:Field Label|Label for player information@@dashboard.player.label:Spieler`,
      'dashboard.player.capital': $localize`:Field Label|Label for player capital@@dashboard.player.capital:Kapital`,
      'dashboard.player.round': $localize`:Field Label|Label for player current round@@dashboard.player.round:Runde`,
      'dashboard.player.soil': $localize`:Field Label|Label for average soil quality@@dashboard.player.soil:Bodenqualität (ø)`,
      'dashboard.player.nutrition': $localize`:Field Label|Label for average nutrition level@@dashboard.player.nutrition:Nährstoffe (ø)`,
      'dashboard.player.submitted': $localize`:Field Label|Label for submission status@@dashboard.player.submitted:Abgegeben?`,
      'dashboard.player.toHuman': $localize`:Action Label|Button to convert AI to human player@@dashboard.player.toHuman:ZU MENSCH`,
      'dashboard.player.toAi': $localize`:Action Label|Button to convert human to AI player@@dashboard.player.toAi:ZU KI`,
      'dashboard.player.login': $localize`:Action Label|Button to log in as player@@dashboard.player.login:LOGIN`,
      'dashboard.player.copyUrl': $localize`:Action Label|Button to copy player login URL@@dashboard.player.copyUrl:URL KOPIEREN`,
      'dashboard.player.printAll': $localize`:Action Label|Button to print all player QR codes@@dashboard.player.printAll:ALLE QR-CODES DRUCKEN`,
      'dashboard.empty.title': $localize`:Heading|Title shown when the games list is empty@@dashboard.empty.title:Keine Spiele gefunden.`,
      'dashboard.empty.subtitle': $localize`:Info Message|Suggestion to create a game when list is empty@@dashboard.empty.subtitle:Erstelle ein neues Spiel, um zu beginnen!`,
      'dashboard.pagination.showing': $localize`:Pagination Info|Text prefix for currently shown items@@dashboard.pagination.showing:Zeige`,
      'dashboard.pagination.of': $localize`:Pagination Info|Text separator for total items count@@dashboard.pagination.of:von`,
      'dashboard.pagination.prev': $localize`:Action Label|Previous page button text@@dashboard.pagination.prev:Zurück`,
      'dashboard.pagination.page': $localize`:Pagination Info|Label for current page@@dashboard.pagination.page:Seite`,
      'dashboard.pagination.next': $localize`:Action Label|Next page button text@@dashboard.pagination.next:Weiter`,
      'dashboard.qr.access': $localize`:Heading|Title for the QR access modal@@dashboard.qr.access:Zugang`,
      'dashboard.qr.scan': $localize`:Info Message|Instruction to scan the QR code@@dashboard.qr.scan:Scannen zum automatischen Anmelden.`,
      'dashboard.qr.print': $localize`:Action Label|Button to print the QR code@@dashboard.qr.print:Drucken`,
      'dashboard.qr.close': $localize`:Action Label|Button to close QR modal@@dashboard.qr.close:Schließen`,
      'dashboard.delete.permanent': $localize`:Heading|Title for permanent deletion modal@@dashboard.delete.permanent:Dauerhaftes Löschen`,
      'dashboard.delete.confirm': $localize`:Heading|Subheading for confirming deletion@@dashboard.delete.confirm:Löschen bestätigen`,
      'dashboard.delete.questionPermanent': $localize`:Question|Confirmation question for permanent deletion@@dashboard.delete.questionPermanent:Dauerhaft löschen?`,
      'dashboard.delete.question': $localize`:Question|Confirmation question for regular deletion@@dashboard.delete.question:Löschen?`,
      'dashboard.delete.questionBatchPermanent': $localize`:Question|Confirmation question for batch permanent deletion@@dashboard.delete.questionBatchPermanent:Ausgewählte dauerhaft löschen?`,
      'dashboard.delete.questionBatch': $localize`:Question|Confirmation question for batch regular deletion@@dashboard.delete.questionBatch:Ausgewählte löschen?`,
      'dashboard.delete.games': $localize`:Object Label|Label for games being deleted@@dashboard.delete.games:Spiel(e)`,
      'dashboard.delete.soft.title': $localize`:Heading|Title for trash information@@dashboard.delete.soft.title:Papierkorb:`,
      'dashboard.delete.soft.desc': $localize`:Info Message|Explanation of how trash works@@dashboard.delete.soft.desc:Spiele werden in den Papierkorb verschoben. Du kannst sie jederzeit wiederherstellen innerhalb von`,
      'dashboard.delete.days': $localize`:Unit Label|Label for days@@dashboard.delete.days:Tagen`,
      'dashboard.delete.warning': $localize`:Alert Label|Warning prefix for permanent deletion@@dashboard.delete.warning:WARNUNG:`,
      'dashboard.delete.permanentDesc': $localize`:Warning Message|Description of the consequences of permanent deletion@@dashboard.delete.permanentDesc:Diese Aktion kann nicht rückgängig gemacht werden. Alle Spieldaten werden sofort zerstört.`,
      'dashboard.delete.typeConfirm': $localize`:Action Instruction|Instruction to type DELETE to confirm@@dashboard.delete.typeConfirm:Tippe <span class="font-mono font-bold text-red-400">DELETE</span> zur Bestätigung:`,
      'dashboard.delete.cancel': $localize`:Action Label|Button to cancel deletion@@dashboard.delete.cancel:Abbrechen`,
      'dashboard.delete.btnPermanent': $localize`:Action Label|Button to confirm permanent deletion@@dashboard.delete.btnPermanent:Dauerhaft löschen`,
      'dashboard.delete.btnGame': $localize`:Action Label|Button to confirm regular deletion@@dashboard.delete.btnGame:Spiel löschen`,
      'dashboard.login.msg': $localize`:Info Message|Message shown when user needs to log in@@dashboard.login.msg:Bitte melde dich an, um auf das Dashboard zuzugreifen.`,
      'dashboard.login.btn': $localize`:Action Label|Button for Google login@@dashboard.login.btn:Anmelden mit Google`,
      'ai.level.elementary': $localize`:Difficulty Label|Elementary level AI@@ai.level.elementary:Grundschule`,
      'ai.level.middle': $localize`:Difficulty Label|Middle level AI@@ai.level.middle:Mittelstufe`,
      'ai.level.high': $localize`:Difficulty Label|High level AI@@ai.level.high:Oberstufe`,
      'user.photoURL': $localize`:Asset Path|Default user photo path@@user.photoURL:assets/images/gut.jpg`,
      'dashboard.adj.green': $localize`:Adjective|Part of random game name generation@@dashboard.adj.green:Grünes`,
      'dashboard.adj.sunny': $localize`:Adjective|Part of random game name generation@@dashboard.adj.sunny:Sonniges`,
      'dashboard.adj.golden': $localize`:Adjective|Part of random game name generation@@dashboard.adj.golden:Goldenes`,
      'dashboard.adj.misty': $localize`:Adjective|Part of random game name generation@@dashboard.adj.misty:Nebeliges`,
      'dashboard.adj.fertile': $localize`:Adjective|Part of random game name generation@@dashboard.adj.fertile:Fruchtbares`,
      'dashboard.adj.quiet': $localize`:Adjective|Part of random game name generation@@dashboard.adj.quiet:Stilles`,
      'dashboard.adj.wild': $localize`:Adjective|Part of random game name generation@@dashboard.adj.wild:Wildes`,
      'dashboard.noun.valley': $localize`:Noun|Part of random game name generation@@dashboard.noun.valley:Tal`,
      'dashboard.noun.field': $localize`:Noun|Part of random game name generation@@dashboard.noun.field:Feld`,
      'dashboard.noun.meadow': $localize`:Noun|Part of random game name generation@@dashboard.noun.meadow:Wiesental`,
      'dashboard.noun.farm': $localize`:Noun|Part of random game name generation@@dashboard.noun.farm:Gut`,
      'dashboard.noun.acre': $localize`:Noun|Part of random game name generation@@dashboard.noun.acre:Land`,
      'dashboard.noun.grove': $localize`:Noun|Part of random game name generation@@dashboard.noun.grove:Hain`,
      'dashboard.noun.orchard': $localize`:Noun|Part of random game name generation@@dashboard.noun.orchard:Garten`,
    };
    return translations[key] || key;
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
      alert(
        $localize`:Success Message|Toast shown after successful feedback submission@@feedback.success:Vielen Dank für dein Feedback!`,
      );
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
    playerLabel: 'Player',
    aiLevel: 'middle' as 'elementary' | 'middle' | 'high',
    subsidiesEnabled: false,
    advancedPricingEnabled: false,
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

  openFinance(
    game: Game,
    slot: { number: number; uid: string; player: PlayerState | null; isJoined: boolean; isAi: boolean },
  ) {
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

  getPlayerKeys(players: Record<string, PlayerState>): string[] {
    if (!players) return [];
    return Object.keys(players);
  }

  async ngOnInit() {
    this.newGameConfig.name = this.getRandomName();
    this.authService.user$.subscribe(async (user) => {
      if (user) {
        if (localStorage.getItem('soil_test_mode') === 'true') {
          this.ngZone.run(() => {
            this.userStatus = { uid: user.uid, role: 'admin', status: 'active', email: user.email || '' };
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
          const userRef = doc(this.db, 'users', user.uid);

          const statusObservable = new Observable<UserStatus | undefined>((observer) => {
            const unsubscribe = onSnapshot(
              userRef,
              { includeMetadataChanges: true },
              (snapshot) => {
                observer.next(snapshot.data() as UserStatus | undefined);
              },
              (error) => {
                observer.error(error);
              },
            );
            return () => unsubscribe();
          });

          this.userStatusSub = statusObservable.subscribe({
            next: (userData) => {
              clearTimeout(timeoutId); // Clear timeout on first response
              this.ngZone.run(() => {
                if (userData) {
                  this.userStatus = userData;

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
                    this.userStatus = { uid: user.uid, role: 'superadmin', status: 'active', email: user.email || '' };
                    this.isLoading = false;
                    this.router.navigate(['/admin/super']);
                    return;
                  }

                  if (localStorage.getItem('soil_test_mode') === 'true') {
                    this.userStatus = { uid: user.uid, role: 'admin', status: 'active', email: user.email || '' };
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
            error: (error) => {
              clearTimeout(timeoutId);
              this.ngZone.run(() => {
                console.error('Dashboard: Subscription error:', error);
                this.errorMessage = `Error loading account status: ${error.message || error}`;
                this.isLoading = false;
                this.cdr.detectChanges();
              });
            },
          });
        } catch (e: unknown) {
          clearTimeout(timeoutId);
          console.error('Dashboard: Sync Error:', e);
          const error = e as Error;
          this.errorMessage = `Critical Error: ${error.message}`;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      } else {
        this.games = [];
        this.userStatus = null;
        this.isLoading = false;
        this.router.navigate(['/admin/login']);
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

  copyLoginUrl(gameId: string, password: string) {
    const url = `${window.location.origin}/game-login?gameId=${gameId}&pin=${password}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        // Maybe show a temporary toast or change button text
      })
      .catch((err) => {
        console.error('Could not copy text: ', err);
      });
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
      this.ngZone.run(() => {
        console.error('Dashboard: Error loading games', e);
        const error = e as Error;
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

  async onGameCreate(config: { numPlayers: number; numRounds: number; numAi: number; playerLabel: string }) {
    this.newGameConfig = { ...this.newGameConfig, ...config };
    await this.createNewGame();
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
      subsidiesEnabled: this.newGameConfig.subsidiesEnabled,
      advancedPricingEnabled: this.newGameConfig.advancedPricingEnabled,
    };

    try {
      const result = await this.gameService.createGame(name, config);
      this.createdGame = { id: result.gameId, password: result.password };
      // alert('Game created successfully!'); // Removed per request
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

  private languageService = inject(LanguageService);

  async shareGame(game: Game) {
    const email = prompt(`Enter email address to send game details:`);
    if (!email) return;

    try {
      await this.gameService.sendGameInvite(game.id, email, this.languageService.currentLang);
      alert('Invite sent successfully!');
    } catch (e: unknown) {
      this.errorMessage = `Failed to send invite: ${(e as Error).message}`;
    }
  }

  async sharePlayer(
    game: Game,
    slot: { number: number; uid: string; player: PlayerState | null; isJoined: boolean; isAi: boolean },
  ) {
    const email = prompt(`Enter email address for Player ${slot.number}:`);
    if (!email) return;

    try {
      await this.gameService.sendPlayerInvite(
        game.id,
        slot.number,
        email,
        window.location.origin,
        this.languageService.currentLang,
      );
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
