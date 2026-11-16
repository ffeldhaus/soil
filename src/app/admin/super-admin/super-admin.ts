import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  NgZone,
  type OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, of } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import type { Feedback, Game, PlayerState, SystemStats, UserStatus } from '../../types';
import { SuperAdminBacklinksComponent } from './components/super-admin-backlinks';
import { SuperAdminFeedbackComponent } from './components/super-admin-feedback';
import { SuperAdminHudComponent } from './components/super-admin-hud';
import { SuperAdminResearchComponent } from './components/super-admin-research';
import { SuperAdminStatsComponent } from './components/super-admin-stats';
import { type AdminAccountRow, SuperAdminUsersComponent } from './components/super-admin-users';

export type SuperAdminTab = 'analytics' | 'users' | 'research' | 'feedback';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SuperAdminHudComponent,
    SuperAdminStatsComponent,
    SuperAdminBacklinksComponent,
    SuperAdminUsersComponent,
    SuperAdminResearchComponent,
    SuperAdminFeedbackComponent,
  ],
  templateUrl: './super-admin.html',
  styleUrl: './super-admin.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SuperAdminComponent implements OnInit {
  gameService = inject(GameService);
  authService = inject(AuthService);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private destroyRef = inject(DestroyRef);

  readonly tabs: ReadonlyArray<{ id: SuperAdminTab; label: string }> = [
    { id: 'analytics', label: 'Zugriffe & Reichweite' },
    { id: 'users', label: 'Lehrkräfte & System' },
    { id: 'research', label: 'Forschungsdaten' },
    { id: 'feedback', label: 'Feedback' },
  ];

  activeTab: SuperAdminTab = 'analytics';

  t(key: string): string {
    const translations: Record<string, string> = {
      'superadmin.title': 'System-Administrator',
      'superadmin.badge': 'System',
      'superadmin.logout': 'Abmelden',
      'superadmin.loading': 'Systemdaten werden geladen …',
      'superadmin.dashboard.title': 'System-Konsole',
      'superadmin.dashboard.subtitle': 'Reichweite, Lehrkräfte-Konten, Forschungsdatensätze und Rückmeldungen',
      'superadmin.dashboard.refresh': 'Aktualisieren',
      'superadmin.delete.game.title': 'Spiel löschen',
      'superadmin.delete.game.confirm': 'Möchtest du folgendes Spiel wirklich löschen:',
      'superadmin.delete.game.permanent': 'Dauerhaft löschen',
      'superadmin.delete.game.soft': 'Das Spiel wird zunächst in den Papierkorb verschoben.',
      'superadmin.delete.game.warning':
        'Diese Aktion kann nicht rückgängig gemacht werden. Alle Spieldaten werden unwiderruflich gelöscht.',
      'superadmin.delete.game.typeConfirm': 'Bitte gib DELETE zur Bestätigung ein:',
      'superadmin.quota.modal.title': 'Spiel-Limit anpassen',
      'superadmin.quota.modal.desc': 'Maximale Anzahl gleichzeitiger Spiele für',
      'superadmin.quota.modal.label': 'Spiel-Limit',
      'superadmin.quota.modal.save': 'Speichern',
      'superadmin.modal.cancel': 'Abbrechen',
      'superadmin.feedback.modal.reply.title': 'Antwort auf Feedback senden',
      'superadmin.feedback.modal.reply.label': 'Deine Nachricht',
      'superadmin.feedback.modal.reply.send': 'Antwort senden',
      'superadmin.feedback.modal.resolve.title': 'Feedback als gelöst markieren',
      'superadmin.feedback.modal.resolve.label': 'Externe Referenz (z. B. GitHub-Link oder Notiz)',
      'superadmin.feedback.modal.resolve.confirm': 'Als gelöst markieren',
      'superadmin.reject.modal.title': 'Feedback ablehnen',
      'superadmin.reject.modal.desc': 'Möchtest du diesen Feedback-Eintrag wirklich als abgelehnt markieren?',
      'superadmin.actions.reject': 'Ablehnen',
    };
    return translations[key] || key;
  }

  admins: AdminAccountRow[] = [];
  feedback: Feedback[] = [];
  researchGames: Game[] = [];
  isLoadingResearchGames = false;
  systemInsights: any[] = [];
  isAnalyzing = false;

  selectedAdmin: AdminAccountRow | null = null;
  adminGames: Game[] = [];
  isLoadingGames = false;

  showQuotaModal = false;
  isSavingQuota = false;
  selectedUserForQuota: AdminAccountRow | null = null;
  newQuotaValue = 0;

  evaluatingPlayers = new Set<string>();
  expandedGames = new Set<string>();

  stats: SystemStats | null = null;
  isLoadingData = typeof window !== 'undefined';
  isRefreshing = false;

  errorMessage: string | null = null;
  adminActionState: { action: 'ban' | 'delete'; user: UserStatus } | null = null;
  adminActionConfirmInput = '';

  feedbackToManage: Feedback | null = null;
  feedbackAction: 'reply' | 'resolve' | 'reject' | null = null;
  feedbackValue = '';
  isManagingFeedback = false;

  gameToDelete: Game | null = null;
  isDeleting = false;
  deleteConfirmInput = '';

  selectTab(tabId: SuperAdminTab, event?: Event): void {
    this.activeTab = tabId;
    const target = event?.currentTarget as HTMLElement | null;
    if (target && typeof target.scrollIntoView === 'function') {
      try {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch {
        // Ignore in JSDOM environments without layout scroll support
      }
    }
    this.cdr.detectChanges();
  }

  onTabKeydown(event: KeyboardEvent, currentIndex: number): void {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % this.tabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = this.tabs.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = this.tabs[nextIndex];
    this.activeTab = nextTab.id;
    this.cdr.detectChanges();

    if (typeof document !== 'undefined') {
      const btn = document.getElementById(`superadmin-tab-${nextTab.id}`);
      btn?.focus();
      if (btn && typeof btn.scrollIntoView === 'function') {
        try {
          btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        } catch {
          // Ignore in test environments
        }
      }
    }
  }

  tabCount(tabId: SuperAdminTab): number | null {
    if (!this.stats) return null;
    switch (tabId) {
      case 'analytics':
        return this.stats.telemetry?.viewsTotal ?? 0;
      case 'users':
        return this.admins.length;
      case 'research':
        return this.researchGames.length;
      case 'feedback':
        return this.feedback.length;
    }
  }

  async ngOnInit() {
    const authReady$ = this.authService.authStateReady$ ?? of(true);
    combineLatest([this.authService.user$, authReady$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([user, authReady]) => {
        if (user) {
          this.loadData();
          return;
        }

        if (!authReady) {
          // Cold reload: wait for Firebase Auth state hydration before redirecting
          return;
        }

        if (typeof window !== 'undefined' && window.localStorage?.getItem('soil_test_mode')) {
          return;
        }

        this.isLoadingData = false;
        this.router.navigate(['/admin/login']);
      });
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/']);
  }

  async loadData() {
    if (this.stats) {
      this.isRefreshing = true;
      this.isLoadingData = false;
    } else {
      this.isLoadingData = true;
      this.isRefreshing = false;
    }
    this.cdr.detectChanges();

    try {
      const [admins, stats, feedback, researchRes, insights] = await Promise.all([
        this.gameService.getAllAdmins(),
        this.gameService.getSystemStats(),
        this.gameService.getAllFeedback(),
        this.gameService.getResearchGames(1, 50),
        this.gameService.getSystemInsights(),
      ]);

      this.ngZone.run(() => {
        this.admins = [...admins].sort(
          (a, b) => this.getTimestampMillis(b.createdAt) - this.getTimestampMillis(a.createdAt),
        );
        this.stats = stats;
        this.feedback = feedback;
        this.researchGames = researchRes.games;
        this.systemInsights = insights;
        this.cdr.detectChanges();
      });
    } catch (err) {
      if (typeof window !== 'undefined' && window.console) {
        console.error('SuperAdmin: Error loading data', err);
      }
    } finally {
      this.isLoadingData = false;
      this.isRefreshing = false;
      this.cdr.detectChanges();
    }
  }

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
      this.errorMessage = `KI-Analyse fehlgeschlagen: ${err.message}`;
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
      if (typeof window !== 'undefined' && window.console) console.error(e);
      const error = e as Error;
      this.errorMessage = `Feedback-Aktion fehlgeschlagen: ${error.message}`;
    }
  }

  setQuota(user: UserStatus & { quota: number }) {
    this.selectedUserForQuota = user as AdminAccountRow;
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
        if (typeof window !== 'undefined' && window.console) console.error(e);
        const error = e as Error;
        this.errorMessage = `Limit konnte nicht gespeichert werden: ${error.message}`;
      }
    }
  }

  banAdmin(user: UserStatus) {
    this.adminActionState = { action: 'ban', user };
    this.adminActionConfirmInput = '';
  }

  deleteAdmin(user: UserStatus) {
    this.adminActionState = { action: 'delete', user };
    this.adminActionConfirmInput = '';
  }

  cancelAdminAction() {
    this.adminActionState = null;
    this.adminActionConfirmInput = '';
  }

  async confirmAdminAction() {
    if (!this.adminActionState) return;
    const { action, user } = this.adminActionState;
    const expected = action === 'ban' ? 'BAN' : 'DELETE';
    if (this.adminActionConfirmInput !== expected) {
      this.errorMessage = `Bitte gib ${expected} zur Bestätigung ein.`;
      return;
    }
    this.adminActionState = null;
    this.adminActionConfirmInput = '';
    try {
      await this.gameService.manageAdmin(user.uid, action);
      this.loadData();
    } catch (e: unknown) {
      this.errorMessage = `Aktion fehlgeschlagen: ${(e as Error).message}`;
    }
  }

  async viewGames(admin: AdminAccountRow) {
    this.selectedAdmin = admin;
    this.isLoadingGames = true;
    this.adminGames = [];
    this.cdr.detectChanges();

    try {
      setTimeout(() => document.getElementById('games-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
      const res = await this.gameService.getAdminGames(1, 100, false, admin.uid);

      this.ngZone.run(() => {
        this.adminGames = res.games;
        this.isLoadingGames = false;
        this.cdr.detectChanges();
      });
    } catch (e: unknown) {
      this.ngZone.run(() => {
        if (typeof window !== 'undefined' && window.console) console.error(e);
        this.isLoadingGames = false;
        this.errorMessage = 'Spiele konnten nicht geladen werden.';
        this.cdr.detectChanges();
      });
    }
  }

  async viewAsPlayer(gameId: string, playerUid: string) {
    this.router.navigate(['/game'], {
      queryParams: {
        gameId,
        playerUid,
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
      this.errorMessage = `System-Analyse fehlgeschlagen: ${err.message}`;
    } finally {
      this.isAnalyzing = false;
      this.cdr.detectChanges();
    }
  }

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
      const isTrash = this.gameToDelete.status === 'deleted' || !!this.gameToDelete.deletedAt;
      const force = isTrash;

      if (force && this.deleteConfirmInput !== 'DELETE') {
        throw new Error('Bitte gib DELETE zur Bestätigung ein.');
      }

      await this.gameService.deleteGames([this.gameToDelete.id], force);

      if (this.selectedAdmin) {
        this.viewGames(this.selectedAdmin);
      }
    } catch (e: unknown) {
      const error = e as Error;
      if (typeof window !== 'undefined' && window.console) console.error(error);
      this.errorMessage = `Löschen fehlgeschlagen: ${error.message}`;
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

  formatDate(
    d: { seconds?: number; nanoseconds?: number } | Record<string, unknown> | Date | string | number | null | undefined,
  ): Date | null {
    if (!d) return null;
    if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d;
    if (typeof d === 'number') return new Date(d);
    if (typeof d === 'string') {
      const parsed = new Date(d);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof (d as any).toDate === 'function') return (d as any).toDate();
    if (typeof (d as any).seconds === 'number') return new Date((d as any).seconds * 1000);
    if (typeof (d as any)._seconds === 'number') return new Date((d as any)._seconds * 1000);
    return null;
  }

  isCloudResearchGame(game: Game): boolean {
    if (game?.sourceType === 'cloud') return true;
    if (game?.sourceType === 'local') return false;
    const rawId = `${game?.id || ''} ${(game as any)?.migratedFrom || ''}`;
    return !rawId.includes('local-');
  }

  getTimestampMillis(d: any): number {
    return this.formatDate(d)?.getTime() ?? 0;
  }
}
