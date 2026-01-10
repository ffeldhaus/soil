import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, NgZone, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import { LanguageService } from '../../services/language.service';
import type { Feedback, Game, SystemStats, UserStatus } from '../../types';
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
  languageService = inject(LanguageService);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  t(key: string): string {
    const translations: Record<string, string> = {
      'superadmin.title': $localize`:Main Heading|Title of the super admin dashboard@@superadmin.title:System-Administrator`,
      'user.photoURL': $localize`:Asset Path|Default user photo path@@user.photoURL:assets/images/ok.jpg`,
      'superadmin.badge': $localize`:Badge Label|Label for system-level badge@@superadmin.badge:System`,
      'superadmin.logout': $localize`:Action Label|Logout button text for super admin@@superadmin.logout:Abmelden`,
      'superadmin.loading': $localize`:Loading State|Text shown while loading super admin data@@superadmin.loading:Daten werden geladen...`,
      'superadmin.dashboard.title': $localize`:Heading|Title for the system dashboard section@@superadmin.dashboard.title:System-Dashboard`,
      'superadmin.dashboard.subtitle': $localize`:Subheading|Description of the system dashboard purpose@@superadmin.dashboard.subtitle:Systemweite Übersicht und Lehrerverwaltung`,
      'superadmin.dashboard.refresh': $localize`:Action Label|Button to refresh system data@@superadmin.dashboard.refresh:Aktualisieren`,
      'superadmin.stats.totalGames': $localize`:Stat Label|Total number of games in the system@@superadmin.stats.totalGames:Gesamt Spiele`,
      'superadmin.stats.created': $localize`:Stat Sub-label|Indicator for created games@@superadmin.stats.created:erstellt`,
      'superadmin.stats.active': $localize`:Stat Sub-label|Indicator for active games@@superadmin.stats.active:Aktiv`,
      'superadmin.stats.trash': $localize`:Stat Sub-label|Indicator for games in trash@@superadmin.stats.trash:Papierkorb`,
      'superadmin.stats.totalUsers': $localize`:Stat Label|Total number of users in the system@@superadmin.stats.totalUsers:Gesamt Benutzer`,
      'superadmin.stats.registered': $localize`:Stat Sub-label|Indicator for registered users@@superadmin.stats.registered:registriert`,
      'superadmin.stats.teachers': $localize`:Stat Sub-label|Indicator for teacher accounts@@superadmin.stats.teachers:Lehrkräfte`,
      'superadmin.stats.pending': $localize`:Stat Sub-label|Indicator for pending approvals@@superadmin.stats.pending:Ausstehend`,
      'superadmin.stats.rejected': $localize`:Stat Sub-label|Indicator for rejected applications@@superadmin.stats.rejected:Abgelehnt`,
      'superadmin.stats.banned': $localize`:Stat Sub-label|Indicator for banned users@@superadmin.stats.banned:Gesperrt`,
      'superadmin.pending.title': $localize`:Heading|Title for pending approvals section@@superadmin.pending.title:Ausstehende Genehmigungen`,
      'superadmin.admins.title': $localize`:Heading|Title for teacher management section@@superadmin.admins.title:Lehrkräfte (Administratoren)`,
      'superadmin.table.user': $localize`:Column Header|Table header for user email or name@@superadmin.table.user:Benutzer / E-Mail`,
      'superadmin.table.role': $localize`:Column Header|Table header for user role@@superadmin.table.role:Rolle`,
      'superadmin.table.status': $localize`:Column Header|Table header for account status@@superadmin.table.status:Status`,
      'superadmin.table.quota': $localize`:Column Header|Table header for game creation limit@@superadmin.table.quota:Limit`,
      'superadmin.table.games': $localize`:Column Header|Table header for number of games@@superadmin.table.games:Spiele`,
      'superadmin.table.actions': $localize`:Column Header|Table header for available actions@@superadmin.table.actions:Aktionen`,
      'superadmin.actions.approve': $localize`:Action Label|Button to approve a user@@superadmin.actions.approve:Genehmigen`,
      'superadmin.actions.reject': $localize`:Action Label|Button to reject a user@@superadmin.actions.reject:Ablehnen`,
      'superadmin.actions.ban': $localize`:Action Label|Button to ban a user@@superadmin.actions.ban:Sperren`,
      'superadmin.actions.delete': $localize`:Action Label|Button to delete a user@@superadmin.actions.delete:Löschen`,
      'superadmin.actions.games': $localize`:Action Label|Button to view user games@@superadmin.actions.games:Spiele`,
      'superadmin.actions.quota': $localize`:Action Label|Button to set user quota@@superadmin.actions.quota:Limit`,
      'superadmin.pending.card.institution': $localize`:Field Label|Institution name in application card@@superadmin.pending.card.institution:Institution`,
      'superadmin.pending.card.website': $localize`:Field Label|Institution website in application card@@superadmin.pending.card.website:Website`,
      'superadmin.pending.card.why': $localize`:Field Label|Explanation for using Soil in application card@@superadmin.pending.card.why:Warum Soil?`,
      'superadmin.pending.card.pending': $localize`:Status Label|Status for application awaiting review@@superadmin.pending.card.pending:Ausstehend`,
      'superadmin.games.title': $localize`:Heading|Title for the user's games modal@@superadmin.games.title:Spiele von`,
      'superadmin.games.close': $localize`:Action Label|Button to close the games modal@@superadmin.games.close:Schließen`,
      'superadmin.games.loading': $localize`:Loading State|Text shown while loading user games@@superadmin.games.loading:Spiele werden geladen...`,
      'superadmin.games.none': $localize`:Empty State|Message shown when no games are found for a teacher@@superadmin.games.none:Keine Spiele für diese Lehrkraft gefunden.`,
      'superadmin.games.status': $localize`:Column Header|Table header for game status@@superadmin.games.status:Status`,
      'superadmin.games.round': $localize`:Column Header|Table header for game round@@superadmin.games.round:Runde`,
      'superadmin.games.created': $localize`:Column Header|Table header for game creation date@@superadmin.games.created:Erstellt`,
      'superadmin.delete.game.title': $localize`:Heading|Title for the game deletion modal@@superadmin.delete.game.title:Spiel löschen`,
      'superadmin.delete.game.confirm': $localize`:Question|Confirmation question for deleting a game@@superadmin.delete.game.confirm:Bist du sicher, dass du dieses Spiel löschen möchtest?`,
      'superadmin.delete.game.permanent': $localize`:Action Label|Button for permanent game deletion@@superadmin.delete.game.permanent:Dauerhaft löschen`,
      'superadmin.delete.game.soft': $localize`:Action Label|Button for moving game to trash@@superadmin.delete.game.soft:In den Papierkorb verschieben`,
      'superadmin.delete.game.warning': $localize`:Warning Message|Warning about the consequences of permanent deletion@@superadmin.delete.game.warning:WARNUNG: Diese Aktion kann nicht rückgängig gemacht werden. Alle Spieldaten werden sofort zerstört.`,
      'superadmin.delete.game.typeConfirm': $localize`:Action Instruction|Instruction to type DELETE to confirm@@superadmin.delete.game.typeConfirm:Tippe <span class="font-mono font-bold text-red-400">DELETE</span> zur Bestätigung:`,
      'superadmin.quota.modal.title': $localize`:Heading|Title for the quota management modal@@superadmin.quota.modal.title:Spiel-Limit setzen`,
      'superadmin.quota.modal.desc': $localize`:Description|Instruction for setting the maximum number of games@@superadmin.quota.modal.desc:Lege fest, wie viele Spiele diese Lehrkraft maximal erstellen darf:`,
      'superadmin.quota.modal.label': $localize`:Field Label|Label for the quota input field@@superadmin.quota.modal.label:Limit`,
      'superadmin.quota.modal.save': $localize`:Action Label|Button to save the new quota@@superadmin.quota.modal.save:Speichern`,
      'superadmin.approve.modal.title': $localize`:Heading|Title for the user approval modal@@superadmin.approve.modal.title:Benutzer genehmigen`,
      'superadmin.approve.modal.desc': $localize`:Question|Confirmation question for approving a user@@superadmin.approve.modal.desc:Bist du sicher, dass du diesen Benutzer genehmigen möchtest?`,
      'superadmin.approve.modal.info': $localize`:Info Message|Explanation of the consequences of approval@@superadmin.approve.modal.info:Dies gewährt vollen administrativen Zugriff auf das Dashboard.`,
      'superadmin.approve.modal.confirm': $localize`:Action Label|Button to confirm user approval@@superadmin.approve.modal.confirm:Genehmigung bestätigen`,
      'superadmin.reject.modal.title': $localize`:Heading|Title for the application rejection modal@@superadmin.reject.modal.title:Registrierung ablehnen`,
      'superadmin.reject.modal.desc': $localize`:Question|Confirmation question for rejecting an application@@superadmin.reject.modal.desc:Bist du sicher, dass du die Registrierung ablehnen möchtest?`,
      'superadmin.reject.modal.reasons': $localize`:Field Label|Label for rejection reasons selection@@superadmin.reject.modal.reasons:Gründe (werden dem Benutzer per E-Mail mitgeteilt)`,
      'superadmin.reject.modal.reason.institution': $localize`:Rejection Reason|Reason indicating institution verification failure@@superadmin.reject.modal.reason.institution:Institution konnte nicht verifiziert werden`,
      'superadmin.reject.modal.reason.insufficient': $localize`:Rejection Reason|Reason indicating insufficient usage explanation@@superadmin.reject.modal.reason.insufficient:Grund für die Nutzung nicht ausreichend`,
      'superadmin.reject.modal.reason.other': $localize`:Rejection Reason|Generic other reason@@superadmin.reject.modal.reason.other:Andere Gründe`,
      'superadmin.reject.modal.custom': $localize`:Field Label|Label for custom rejection message@@superadmin.reject.modal.custom:Zusätzliche Nachricht (optional)`,
      'superadmin.reject.modal.ban': $localize`:Action Label|Option to ban the email address@@superadmin.reject.modal.ban:E-Mail-Adresse sperren`,
      'superadmin.reject.modal.banInfo': $localize`:Info Message|Explanation of what banning an email does@@superadmin.reject.modal.banInfo:Blockiert diese E-Mail-Adresse für zukünftige Registrierungen.`,
      'superadmin.reject.modal.send': $localize`:Action Label|Button to send the rejection@@superadmin.reject.modal.send:Ablehnung senden`,
      'superadmin.modal.cancel': $localize`:Action Label|Button to cancel and close a modal@@superadmin.modal.cancel:Abbrechen`,
      'superadmin.feedback.title': $localize`:Heading|Title for the feedback management section@@superadmin.feedback.title:Feedback & Vorschläge`,
      'superadmin.feedback.none': $localize`:Empty State|Message shown when no feedback is found@@superadmin.feedback.none:Kein Feedback gefunden.`,
      'superadmin.feedback.table.user': $localize`:Column Header|Table header for user who gave feedback@@superadmin.feedback.table.user:Benutzer`,
      'superadmin.feedback.table.category': $localize`:Column Header|Table header for feedback category@@superadmin.feedback.table.category:Kategorie`,
      'superadmin.feedback.table.rating': $localize`:Column Header|Table header for feedback rating@@superadmin.feedback.table.rating:Bewertung`,
      'superadmin.feedback.table.status': $localize`:Column Header|Table header for feedback status@@superadmin.feedback.table.status:Status`,
      'superadmin.feedback.actions.reply': $localize`:Action Label|Button to reply to feedback@@superadmin.feedback.actions.reply:Antworten`,
      'superadmin.feedback.actions.resolve': $localize`:Action Label|Button to resolve feedback@@superadmin.feedback.actions.resolve:Lösen`,
      'superadmin.feedback.actions.reject': $localize`:Action Label|Button to reject feedback@@superadmin.feedback.actions.reject:Ablehnen`,
      'superadmin.feedback.modal.reply.title': $localize`:Heading|Title for the feedback reply modal@@superadmin.feedback.modal.reply.title:Antwort an Benutzer`,
      'superadmin.feedback.modal.reply.label': $localize`:Field Label|Label for the reply message input@@superadmin.feedback.modal.reply.label:Deine Nachricht`,
      'superadmin.feedback.modal.reply.send': $localize`:Action Label|Button to send the feedback reply@@superadmin.feedback.modal.reply.send:Antwort senden`,
      'superadmin.feedback.modal.resolve.title': $localize`:Heading|Title for the feedback resolution modal@@superadmin.feedback.modal.resolve.title:Feedback lösen`,
      'superadmin.feedback.modal.resolve.label': $localize`:Field Label|Label for external reference input when resolving feedback@@superadmin.feedback.modal.resolve.label:Externe Referenz (z.B. GitHub Link)`,
      'superadmin.feedback.modal.resolve.confirm': $localize`:Action Label|Button to confirm feedback resolution@@superadmin.feedback.modal.resolve.confirm:Als gelöst markieren`,
    };
    return translations[key] || key;
  }

  pendingUsers: UserStatus[] = [];
  admins: (UserStatus & { gameCount: number; quota: number })[] = [];
  feedback: Feedback[] = [];

  selectedAdmin: (UserStatus & { gameCount: number; quota: number }) | null = null;
  adminGames: Game[] = [];
  isLoadingGames = false;

  showQuotaModal = false;
  selectedUserForQuota: (UserStatus & { gameCount: number; quota: number }) | null = null;
  newQuotaValue = 0;

  async ngOnInit() {
    this.authService.user$.subscribe((user) => {
      if (user) {
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
      const [pendingUsers, admins, stats, feedback] = await Promise.all([
        this.gameService.getPendingUsers(),
        this.gameService.getAllAdmins(),
        this.gameService.getSystemStats(),
        this.gameService.getAllFeedback(),
      ]);

      this.ngZone.run(() => {
        this.pendingUsers = pendingUsers;
        this.admins = admins;
        this.stats = stats;
        this.feedback = feedback;
        if (window.console)
          console.warn('SuperAdmin: Data loaded', {
            pending: this.pendingUsers.length,
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

  // Feedback Management
  feedbackToManage: Feedback | null = null;
  feedbackAction: 'reply' | 'resolve' | 'reject' | null = null;
  feedbackValue = '';

  initiateFeedbackAction(item: Feedback, action: 'reply' | 'resolve' | 'reject') {
    this.feedbackToManage = item;
    this.feedbackAction = action;
    this.feedbackValue = '';
  }

  cancelFeedbackAction() {
    this.feedbackToManage = null;
    this.feedbackAction = null;
    this.feedbackValue = '';
  }

  async confirmFeedbackAction() {
    if (!this.feedbackToManage || !this.feedbackAction) return;

    const value: { response?: string; externalReference?: string } = {};
    if (this.feedbackAction === 'reply') {
      value.response = this.feedbackValue;
    } else if (this.feedbackAction === 'resolve') {
      value.externalReference = this.feedbackValue;
    }

    try {
      await this.gameService.manageFeedback(this.feedbackToManage.id, this.feedbackAction, value);
      this.cancelFeedbackAction();
      this.loadData();
    } catch (e: unknown) {
      if (window.console) console.error(e);
      const error = e as Error;
      alert(`Failed to manage feedback: ${error.message}`);
    }
  }

  userToApprove: UserStatus | null = null;

  initiateApprove(user: UserStatus) {
    this.userToApprove = user;
  }

  cancelApprove() {
    this.userToApprove = null;
  }

  async confirmApprove() {
    if (!this.userToApprove) return;

    const user = this.userToApprove;
    await this.gameService.manageAdmin(
      user.uid,
      'approve',
      undefined,
      this.languageService.currentLang,
      window.location.origin,
    );
    this.loadData();
  }

  userToReject: UserStatus | null = null;
  showRejectModal = false;
  rejectionReasons: string[] = [];
  customRejectionMessage = '';
  banEmailOnReject = false;

  initiateReject(user: UserStatus) {
    this.userToReject = user;
    this.rejectionReasons = [];
    this.customRejectionMessage = '';
    this.banEmailOnReject = false;
    this.showRejectModal = true;
  }

  cancelReject() {
    this.showRejectModal = false;
    this.userToReject = null;
  }

  toggleRejectionReason(reason: string) {
    if (this.rejectionReasons.includes(reason)) {
      this.rejectionReasons = this.rejectionReasons.filter((r) => r !== reason);
    } else {
      this.rejectionReasons.push(reason);
    }
  }

  async confirmReject() {
    if (!this.userToReject) return;

    const user = this.userToReject;
    this.showRejectModal = false;

    await this.gameService.manageAdmin(
      user.uid,
      'reject',
      {
        rejectionReasons: this.rejectionReasons,
        customMessage: this.customRejectionMessage,
        banEmail: this.banEmailOnReject,
      },
      this.languageService.currentLang,
      window.location.origin,
    );
    this.loadData();
    this.userToReject = null;
  }

  // Old method kept for reference or direct calls if needed, but unused by template now
  async approveUser(user: UserStatus) {
    if (!confirm(`Approve ${user.email}?`)) return;
    await this.gameService.manageAdmin(
      user.uid,
      'approve',
      undefined,
      this.languageService.currentLang,
      window.location.origin,
    );
    this.loadData();
  }

  async rejectUser(user: UserStatus) {
    const ban = confirm(`Reject ${user.email}?\n\nPress OK to REJECT only.\nPress CANCEL to consider other options.`);
    if (ban) {
      await this.gameService.manageAdmin(user.uid, 'reject');
      this.loadData();
      return;
    }

    // If they cancelled, maybe they want to BAN?
    // A bit clunky with native alerts. Let's try:
    const reallyBan = confirm(`Do you want to BAN ${user.email} and block this email from future usage?`);
    if (reallyBan) {
      await this.gameService.manageAdmin(user.uid, 'reject', { banEmail: true });
      this.loadData();
    }
  }

  // Open the modal
  setQuota(user: UserStatus & { quota: number }) {
    this.selectedUserForQuota = user as UserStatus & { gameCount: number; quota: number };
    this.newQuotaValue = user.quota;
    this.showQuotaModal = true;
  }

  closeQuotaModal() {
    this.showQuotaModal = false;
    this.selectedUserForQuota = null;
  }

  async saveQuota() {
    if (this.selectedUserForQuota && this.newQuotaValue >= 0) {
      this.showQuotaModal = false; // Optimistic close
      await this.gameService.manageAdmin(this.selectedUserForQuota.uid, 'setQuota', this.newQuotaValue);
      this.loadData();
      this.selectedUserForQuota = null;
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
