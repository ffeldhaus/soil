import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, NgZone, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import type { Feedback, Game, PlayerState, SystemStats, UserStatus } from '../../types';
import { SuperAdminHudComponent } from './components/super-admin-hud';
import { SuperAdminStatsComponent } from './components/super-admin-stats';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, SuperAdminHudComponent, SuperAdminStatsComponent],
  templateUrl: './super-admin.html',
})
export class SuperAdminComponent implements OnInit {
  gameService = inject(GameService);
  authService = inject(AuthService);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  t(key: string): string {
    const translations: Record<string, string> = {
      'superadmin.title': 'System-Administrator',
      'user.photoURL': 'assets/images/gut.jpg',
      'superadmin.badge': 'System',
      'superadmin.logout': 'Abmelden',
      'superadmin.loading': 'Daten werden geladen...',
      'superadmin.dashboard.title': 'System-Dashboard',
      'superadmin.dashboard.subtitle': 'Systemweite Übersicht und Lehrerverwaltung',
      'superadmin.dashboard.refresh': 'Aktualisieren',
      'superadmin.stats.totalGames': 'Gesamt Spiele',
      'superadmin.stats.created': 'erstellt',
      'superadmin.stats.active': 'Aktiv',
      'superadmin.stats.trash': 'Papierkorb',
      'superadmin.stats.totalUsers': 'Gesamt Benutzer',
      'superadmin.stats.registered': 'registriert',
      'superadmin.stats.teachers': 'Lehrkräfte',
      'superadmin.stats.rejected': 'Abgelehnt',
      'superadmin.stats.banned': 'Gesperrt',
      'superadmin.admins.title': 'Lehrkräfte (Administratoren)',
      'superadmin.table.user': 'Benutzer / E-Mail',
      'superadmin.table.role': 'Rolle',
      'superadmin.table.status': 'Status',
      'superadmin.table.quota': 'Limit',
      'superadmin.table.games': 'Spiele',
      'superadmin.table.actions': 'Aktionen',
      'superadmin.actions.ban': 'Sperren',
      'superadmin.actions.delete': 'Löschen',
      'superadmin.actions.games': 'Spiele',
      'superadmin.actions.quota': 'Limit',
      'superadmin.games.title': 'Spiele von',
      'superadmin.games.close': 'Schließen',
      'superadmin.games.loading': 'Spiele werden geladen...',
      'superadmin.games.none': 'Keine Spiele für diese Lehrkraft gefunden.',
      'superadmin.games.status': 'Status',
      'superadmin.games.round': 'Runde',
      'superadmin.games.created': 'Erstellt',
      'superadmin.delete.game.title': 'Spiel löschen',
      'superadmin.delete.game.confirm': 'Bist du sicher, dass du dieses Spiel löschen möchtest?',
      'superadmin.delete.game.permanent': 'Dauerhaft löschen',
      'superadmin.delete.game.soft': 'In den Papierkorb verschieben',
      'superadmin.delete.game.warning':
        ' Diese Aktion kann nicht rückgängig gemacht werden. Alle Spieldaten werden sofort zerstört.',
      'superadmin.delete.game.typeConfirm': '',
      'superadmin.quota.modal.title': 'Spiel-Limit setzen',
      'superadmin.quota.modal.desc': '',
      'superadmin.quota.modal.label': 'Limit',
      'superadmin.quota.modal.save': 'Speichern',
      'superadmin.modal.cancel': 'Abbrechen',
      'superadmin.evaluation.title': 'Strategie-Analyse',
      'superadmin.evaluation.btn': 'KI-Analyse starten',
      'superadmin.evaluation.evaluating': 'Analysiere...',
      'superadmin.evaluation.playStyle': 'Spielstil',
      'superadmin.evaluation.analysis': 'Analyse',
      'superadmin.evaluation.improvements': 'Verbesserungsvorschläge (Mechanik)',
      'superadmin.evaluation.date': 'Analysiert am',
      'superadmin.research.title': 'Forschungsdaten (Lokale Spiele)',
      'superadmin.table.game': 'Spiel',
      'superadmin.table.rounds': 'Runden',
      'superadmin.table.capital': 'Kapital',
      'superadmin.table.soil': 'Boden',
      'superadmin.actions.view': 'Ansehen',
      'superadmin.feedback.title': 'Feedback & Vorschläge',
      'superadmin.feedback.none': 'Kein Feedback gefunden.',
      'superadmin.feedback.table.user': 'Benutzer',
      'superadmin.feedback.table.category': 'Kategorie',
      'superadmin.feedback.table.rating': 'Bewertung',
      'superadmin.feedback.table.status': 'Status',
      'superadmin.feedback.actions.reply': 'Antworten',
      'superadmin.feedback.actions.resolve': 'Lösen',
      'superadmin.feedback.actions.reject': 'Ablehnen',
      'superadmin.feedback.modal.reply.title': 'Antwort an Benutzer',
      'superadmin.feedback.modal.reply.label': 'Deine Nachricht',
      'superadmin.feedback.modal.reply.send': 'Antwort senden',
      'superadmin.feedback.modal.resolve.title': 'Feedback lösen',
      'superadmin.feedback.modal.resolve.label': 'Externe Referenz (z.B. GitHub Link)',
      'superadmin.feedback.modal.resolve.confirm': 'Als gelöst markieren',
    };
    return translations[key] || key;
  }

  admins: (UserStatus & { gameCount: number; quota: number })[] = [];
  feedback: Feedback[] = [];
  researchGames: Game[] = [];
  isLoadingResearchGames = false;
  systemInsights: any[] = [];
  isAnalyzing = false;

  selectedAdmin: (UserStatus & { gameCount: number; quota: number }) | null = null;
  adminGames: Game[] = [];
  isLoadingGames = false;

  showQuotaModal = false;

  isSavingQuota = false;

  selectedUserForQuota: (UserStatus & { gameCount: number; quota: number }) | null = null;

  newQuotaValue = 0;

  evaluatingPlayers = new Set<string>(); // gameId + uid
  expandedGames = new Set<string>(); // gameIds

  async ngOnInit() {
    this.authService.user$.subscribe((user) => {
      if (user) {
        if (localStorage.getItem('soil_test_mode') === 'true') {
          this.loadData();

          return;
        }

        // User is authenticated

        this.loadData();
      } else {
        // Wait a bit or check if we are truly logged out?

        // For now, we respect the original logic but adding a log.

        if (window.console) console.warn('SuperAdmin: No user, possible redirect needed');

        // We only redirect if we are sure. This logic was arguably aggressive

        // (redirecting on initial null) but if it works for the user generally,

        // I will leave the strict redirect for now, focused on the DATA LOADING issue.

        // However, if the user IS logged in, this block shouldn't persist.

        if (localStorage.getItem('soil_test_mode')) return; // Avoid redirect in test mode if applicable

        this.router.navigate(['/admin/login']);
      }
    });
  }

  async logout() {
    await this.authService.logout();

    this.router.navigate(['/']);
  }

  stats: SystemStats | null = null;

  isLoadingData = false;

  async loadData() {
    this.isLoadingData = true;

    if (window.console) console.warn('SuperAdmin: Loading data...');

    try {
      const [admins, stats, feedback, researchRes, insights] = await Promise.all([
        this.gameService.getAllAdmins(),
        this.gameService.getSystemStats(),
        this.gameService.getAllFeedback(),
        this.gameService.getResearchGames(1, 50),
        this.gameService.getSystemInsights(),
      ]);

      this.ngZone.run(() => {
        this.admins = admins;
        this.stats = stats;
        this.feedback = feedback;
        this.researchGames = researchRes.games;
        this.systemInsights = insights;

        if (window.console)
          console.warn('SuperAdmin: Data loaded', {
            admins: this.admins.length,

            feedback: this.feedback.length,
          });

        this.cdr.detectChanges();
      });
    } catch (err) {
      if (window.console) console.error('SuperAdmin: Error loading data', err);
    } finally {
      this.isLoadingData = false;

      this.cdr.detectChanges();
    }
  }

  // Evaluation Logic
  async evaluatePlayer(game: Game, player: PlayerState) {
    const key = `${game.id}-${player.uid}`;
    this.evaluatingPlayers.add(key);
    this.cdr.detectChanges();

    try {
      const evaluation = await this.gameService.evaluateGame(game.id, player.uid);
      this.ngZone.run(() => {
        if (!game.evaluations) game.evaluations = {};
        game.evaluations[player.uid] = evaluation;
        this.evaluatingPlayers.delete(key);
        this.cdr.detectChanges();
      });
    } catch (err: any) {
      this.evaluatingPlayers.delete(key);
      alert(`Evaluation failed: ${err.message}`);
      this.cdr.detectChanges();
    }
  }

  getPlayers(game: Game): PlayerState[] {
    return Object.values(game.players || {}).filter((p) => !p.isAi);
  }

  toggleGameExpansion(gameId: string) {
    if (this.expandedGames.has(gameId)) {
      this.expandedGames.delete(gameId);
    } else {
      this.expandedGames.add(gameId);
    }
    this.cdr.detectChanges();
  }

  // Feedback Management

  feedbackToManage: Feedback | null = null;

  feedbackAction: 'reply' | 'resolve' | 'reject' | null = null;

  feedbackValue = '';

  isManagingFeedback = false;

  initiateFeedbackAction(item: Feedback, action: 'reply' | 'resolve' | 'reject') {
    this.feedbackToManage = item;

    this.feedbackAction = action;

    this.feedbackValue = '';

    this.isManagingFeedback = false;
  }

  cancelFeedbackAction() {
    this.feedbackToManage = null;

    this.feedbackAction = null;

    this.feedbackValue = '';

    this.isManagingFeedback = false;
  }

  async confirmFeedbackAction() {
    if (!this.feedbackToManage || !this.feedbackAction) return;

    this.isManagingFeedback = true;

    const value: { response?: string; externalReference?: string } = {};

    if (this.feedbackAction === 'reply') {
      value.response = this.feedbackValue;
    } else if (this.feedbackAction === 'resolve') {
      value.externalReference = this.feedbackValue;
    }

    try {
      await this.gameService.manageFeedback(this.feedbackToManage.id, this.feedbackAction, value);

      this.isManagingFeedback = false;

      this.cancelFeedbackAction();

      this.loadData();
    } catch (e: unknown) {
      this.isManagingFeedback = false;

      if (window.console) console.error(e);

      const error = e as Error;

      alert(`Failed to manage feedback: ${error.message}`);
    }
  }

  // Quota Management

  setQuota(user: UserStatus & { quota: number }) {
    this.selectedUserForQuota = user as UserStatus & { gameCount: number; quota: number };

    this.newQuotaValue = user.quota;

    this.showQuotaModal = true;

    this.isSavingQuota = false;
  }

  closeQuotaModal() {
    this.showQuotaModal = false;

    this.selectedUserForQuota = null;

    this.isSavingQuota = false;
  }

  async saveQuota() {
    if (this.selectedUserForQuota && this.newQuotaValue >= 0) {
      this.isSavingQuota = true;

      try {
        await this.gameService.manageAdmin(this.selectedUserForQuota.uid, 'setQuota', this.newQuotaValue);

        this.isSavingQuota = false;

        this.showQuotaModal = false;

        this.loadData();

        this.selectedUserForQuota = null;
      } catch (e: unknown) {
        this.isSavingQuota = false;

        if (window.console) console.error(e);

        const error = e as Error;

        alert(`Failed to save quota: ${error.message}`);
      }
    }
  }

  async banAdmin(user: UserStatus) {
    const confirmBan = prompt(`Type "BAN" to permanently ban ${user.email} and block their email.`);
    if (confirmBan === 'BAN') {
      await this.gameService.manageAdmin(user.uid, 'ban');
      this.loadData();
    }
  }

  async deleteAdmin(user: UserStatus) {
    const confirmDelete = prompt(`Type "DELETE" to PERMANENTLY DELETE ${user.email}. This cannot be undone.`);
    if (confirmDelete === 'DELETE') {
      await this.gameService.manageAdmin(user.uid, 'delete');
      this.loadData();
    }
  }

  async viewGames(admin: UserStatus & { gameCount: number; quota: number }) {
    this.selectedAdmin = admin;
    this.isLoadingGames = true;
    this.adminGames = [];
    this.cdr.detectChanges();

    try {
      // Force scroll to games
      setTimeout(() => document.getElementById('games-section')?.scrollIntoView({ behavior: 'smooth' }), 100);

      const res = await this.gameService.getAdminGames(1, 100, false, admin.uid);

      this.ngZone.run(() => {
        if (window.console) console.warn('SuperAdmin: Games loaded', res.games.length);
        this.adminGames = res.games;
        this.isLoadingGames = false;
        this.cdr.detectChanges();
      });
    } catch (e: unknown) {
      this.ngZone.run(() => {
        if (window.console) console.error(e);
        this.isLoadingGames = false;
        alert('Failed to load games');
        this.cdr.detectChanges();
      });
    }
  }

  async viewAsPlayer(gameId: string, playerUid: string) {
    this.router.navigate(['/game'], {
      queryParams: {
        gameId: gameId,
        playerUid: playerUid,
        viewOnly: 'true',
      },
    });
  }

  async analyzeSystem() {
    this.isAnalyzing = true;
    this.cdr.detectChanges();
    try {
      await this.gameService.analyzeSystemBalance();
      await this.loadData();
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      this.isAnalyzing = false;
      this.cdr.detectChanges();
    }
  }

  // Delete Logic
  gameToDelete: Game | null = null;
  isDeleting = false;
  deleteConfirmInput = '';

  async deleteGame(game: Game) {
    this.gameToDelete = game;
    this.deleteConfirmInput = '';
  }

  cancelDelete() {
    this.gameToDelete = null;
    this.isDeleting = false;
    this.deleteConfirmInput = '';
  }

  async confirmDelete() {
    if (!this.gameToDelete) return;

    this.isDeleting = true;
    try {
      // Check if it's a hard delete (if already deleted)
      const isTrash = this.gameToDelete.status === 'deleted' || !!this.gameToDelete.deletedAt;
      const force = isTrash;

      if (force && this.deleteConfirmInput !== 'DELETE') {
        throw new Error('Please type DELETE to confirm.');
      }

      await this.gameService.deleteGames([this.gameToDelete.id], force);

      // Refresh
      if (this.selectedAdmin) {
        this.viewGames(this.selectedAdmin);
      }
    } catch (e: unknown) {
      const error = e as Error;
      if (window.console) console.error(error);
      alert(`Failed to delete: ${error.message}`);
    } finally {
      this.isDeleting = false;
      this.gameToDelete = null;
      this.deleteConfirmInput = '';
      this.cdr.detectChanges();
    }
  }

  isTrash(game: Game): boolean {
    return game?.status === 'deleted' || !!game?.deletedAt;
  }

  formatDate(d: { seconds: number; nanoseconds: number } | Date | string | null | undefined): Date | null {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === 'string') return new Date(d);
    if ('seconds' in d) return new Date(d.seconds * 1000);
    return null;
  }
}
