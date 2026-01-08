import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import { LanguageService } from '../../services/language.service';
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
      'superadmin.title': $localize`:@@superadmin.title:System-Administrator`,
      'user.photoURL': $localize`:@@user.photoURL:assets/images/ok.jpg`,
      'superadmin.badge': $localize`:@@superadmin.badge:System`,
      'superadmin.logout': $localize`:@@superadmin.logout:Abmelden`,
      'superadmin.loading': $localize`:@@superadmin.loading:Daten werden geladen...`,
      'superadmin.dashboard.title': $localize`:@@superadmin.dashboard.title:System-Dashboard`,
      'superadmin.dashboard.subtitle': $localize`:@@superadmin.dashboard.subtitle:Systemweite Übersicht und Lehrerverwaltung`,
      'superadmin.dashboard.refresh': $localize`:@@superadmin.dashboard.refresh:Aktualisieren`,
      'superadmin.stats.totalGames': $localize`:@@superadmin.stats.totalGames:Gesamt Spiele`,
      'superadmin.stats.created': $localize`:@@superadmin.stats.created:erstellt`,
      'superadmin.stats.active': $localize`:@@superadmin.stats.active:Aktiv`,
      'superadmin.stats.trash': $localize`:@@superadmin.stats.trash:Papierkorb`,
      'superadmin.stats.totalUsers': $localize`:@@superadmin.stats.totalUsers:Gesamt Benutzer`,
      'superadmin.stats.registered': $localize`:@@superadmin.stats.registered:registriert`,
      'superadmin.stats.teachers': $localize`:@@superadmin.stats.teachers:Lehrkräfte`,
      'superadmin.stats.pending': $localize`:@@superadmin.stats.pending:Ausstehend`,
      'superadmin.stats.rejected': $localize`:@@superadmin.stats.rejected:Abgelehnt`,
      'superadmin.stats.banned': $localize`:@@superadmin.stats.banned:Gesperrt`,
      'superadmin.pending.title': $localize`:@@superadmin.pending.title:Ausstehende Genehmigungen`,
      'superadmin.admins.title': $localize`:@@superadmin.admins.title:Lehrkräfte (Administratoren)`,
      'superadmin.table.user': $localize`:@@superadmin.table.user:Benutzer / E-Mail`,
      'superadmin.table.role': $localize`:@@superadmin.table.role:Rolle`,
      'superadmin.table.status': $localize`:@@superadmin.table.status:Status`,
      'superadmin.table.quota': $localize`:@@superadmin.table.quota:Limit`,
      'superadmin.table.games': $localize`:@@superadmin.table.games:Spiele`,
      'superadmin.table.actions': $localize`:@@superadmin.table.actions:Aktionen`,
      'superadmin.actions.approve': $localize`:@@superadmin.actions.approve:Genehmigen`,
      'superadmin.actions.reject': $localize`:@@superadmin.actions.reject:Ablehnen`,
      'superadmin.actions.ban': $localize`:@@superadmin.actions.ban:Sperren`,
      'superadmin.actions.delete': $localize`:@@superadmin.actions.delete:Löschen`,
      'superadmin.actions.games': $localize`:@@superadmin.actions.games:Spiele`,
      'superadmin.actions.quota': $localize`:@@superadmin.actions.quota:Limit`,
      'superadmin.pending.card.institution': $localize`:@@superadmin.pending.card.institution:Institution`,
      'superadmin.pending.card.website': $localize`:@@superadmin.pending.card.website:Website`,
      'superadmin.pending.card.why': $localize`:@@superadmin.pending.card.why:Warum Soil?`,
      'superadmin.pending.card.pending': $localize`:@@superadmin.pending.card.pending:Ausstehend`,
      'superadmin.games.title': $localize`:@@superadmin.games.title:Spiele von`,
      'superadmin.games.close': $localize`:@@superadmin.games.close:Schließen`,
      'superadmin.games.loading': $localize`:@@superadmin.games.loading:Spiele werden geladen...`,
      'superadmin.games.none': $localize`:@@superadmin.games.none:Keine Spiele für diese Lehrkraft gefunden.`,
      'superadmin.games.status': $localize`:@@superadmin.games.status:Status`,
      'superadmin.games.round': $localize`:@@superadmin.games.round:Runde`,
      'superadmin.games.created': $localize`:@@superadmin.games.created:Erstellt`,
      'superadmin.delete.game.title': $localize`:@@superadmin.delete.game.title:Spiel löschen`,
      'superadmin.delete.game.confirm': $localize`:@@superadmin.delete.game.confirm:Bist du sicher, dass du dieses Spiel löschen möchtest?`,
      'superadmin.delete.game.permanent': $localize`:@@superadmin.delete.game.permanent:Dauerhaft löschen`,
      'superadmin.delete.game.soft': $localize`:@@superadmin.delete.game.soft:In den Papierkorb verschieben`,
      'superadmin.delete.game.warning': $localize`:@@superadmin.delete.game.warning:WARNUNG: Diese Aktion kann nicht rückgängig gemacht werden. Alle Spieldaten werden sofort zerstört.`,
      'superadmin.delete.game.typeConfirm': $localize`:@@superadmin.delete.game.typeConfirm:Tippe <span class="font-mono font-bold text-red-400">DELETE</span> zur Bestätigung:`,
      'superadmin.quota.modal.title': $localize`:@@superadmin.quota.modal.title:Spiel-Limit setzen`,
      'superadmin.quota.modal.desc': $localize`:@@superadmin.quota.modal.desc:Lege fest, wie viele Spiele diese Lehrkraft maximal erstellen darf:`,
      'superadmin.quota.modal.label': $localize`:@@superadmin.quota.modal.label:Limit`,
      'superadmin.quota.modal.save': $localize`:@@superadmin.quota.modal.save:Speichern`,
      'superadmin.approve.modal.title': $localize`:@@superadmin.approve.modal.title:Benutzer genehmigen`,
      'superadmin.approve.modal.desc': $localize`:@@superadmin.approve.modal.desc:Bist du sicher, dass du diesen Benutzer genehmigen möchtest?`,
      'superadmin.approve.modal.info': $localize`:@@superadmin.approve.modal.info:Dies gewährt vollen administrativen Zugriff auf das Dashboard.`,
      'superadmin.approve.modal.confirm': $localize`:@@superadmin.approve.modal.confirm:Genehmigung bestätigen`,
      'superadmin.reject.modal.title': $localize`:@@superadmin.reject.modal.title:Registrierung ablehnen`,
      'superadmin.reject.modal.desc': $localize`:@@superadmin.reject.modal.desc:Bist du sicher, dass du die Registrierung ablehnen möchtest?`,
      'superadmin.reject.modal.reasons': $localize`:@@superadmin.reject.modal.reasons:Gründe (werden dem Benutzer per E-Mail mitgeteilt)`,
      'superadmin.reject.modal.reason.institution': $localize`:@@superadmin.reject.modal.reason.institution:Institution konnte nicht verifiziert werden`,
      'superadmin.reject.modal.reason.insufficient': $localize`:@@superadmin.reject.modal.reason.insufficient:Grund für die Nutzung nicht ausreichend`,
      'superadmin.reject.modal.reason.other': $localize`:@@superadmin.reject.modal.reason.other:Andere Gründe`,
      'superadmin.reject.modal.custom': $localize`:@@superadmin.reject.modal.custom:Zusätzliche Nachricht (optional)`,
      'superadmin.reject.modal.ban': $localize`:@@superadmin.reject.modal.ban:E-Mail-Adresse sperren`,
      'superadmin.reject.modal.banInfo': $localize`:@@superadmin.reject.modal.banInfo:Blockiert diese E-Mail-Adresse für zukünftige Registrierungen.`,
      'superadmin.reject.modal.send': $localize`:@@superadmin.reject.modal.send:Ablehnung senden`,
      'superadmin.modal.cancel': $localize`:@@superadmin.modal.cancel:Abbrechen`,
    };
    return translations[key] || key;
  }

  pendingUsers: any[] = [];
  admins: any[] = [];

  selectedAdmin: any = null;
  adminGames: any[] = [];
  isLoadingGames = false;

  showQuotaModal = false;
  selectedUserForQuota: any = null;
  newQuotaValue = 0;

  async ngOnInit() {
    this.authService.user$.subscribe((user) => {
      if (user) {
        // User is authenticated
        this.loadData();
      } else {
        // Wait a bit or check if we are truly logged out?
        // For now, we respect the original logic but adding a log.
        console.log('SuperAdmin: No user, possible redirect needed');
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

  stats: any = null;
  isLoadingData = false;

  async loadData() {
    this.isLoadingData = true;
    console.log('SuperAdmin: Loading data...');
    try {
      const [pendingUsers, admins, stats] = await Promise.all([
        this.gameService.getPendingUsers(),
        this.gameService.getAllAdmins(),
        this.gameService.getSystemStats(),
      ]);

      this.ngZone.run(() => {
        this.pendingUsers = pendingUsers;
        this.admins = admins;
        this.stats = stats;
        console.log('SuperAdmin: Data loaded', {
          pending: this.pendingUsers.length,
          admins: this.admins.length,
        });
        this.cdr.detectChanges();
      });
    } catch (err) {
      console.error('SuperAdmin: Error loading data', err);
    } finally {
      this.isLoadingData = false;
      this.cdr.detectChanges();
    }
  }

  userToApprove: any = null;

  initiateApprove(user: any) {
    this.userToApprove = user;
  }

  cancelApprove() {
    this.userToApprove = null;
  }

  async confirmApprove() {
    if (!this.userToApprove) return;

    const user = this.userToApprove;
    this.userToApprove = null; // Close modal immediately

    await this.gameService.manageAdmin(user.uid, 'approve', null, this.languageService.currentLang);
    this.loadData();
  }

  userToReject: any = null;
  showRejectModal = false;
  rejectionReasons: string[] = [];
  customRejectionMessage = '';
  banEmailOnReject = false;

  initiateReject(user: any) {
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
    );
    this.loadData();
    this.userToReject = null;
  }

  // Old method kept for reference or direct calls if needed, but unused by template now
  async approveUser(user: any) {
    if (!confirm(`Approve ${user.email}?`)) return;
    await this.gameService.manageAdmin(user.uid, 'approve', null, this.languageService.currentLang);
    this.loadData();
  }

  async rejectUser(user: any) {
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
  setQuota(user: any) {
    this.selectedUserForQuota = user;
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

  async banAdmin(user: any) {
    const confirmBan = prompt(`Type "BAN" to permanently ban ${user.email} and block their email.`);
    if (confirmBan === 'BAN') {
      await this.gameService.manageAdmin(user.uid, 'ban');
      this.loadData();
    }
  }

  async deleteAdmin(user: any) {
    const confirmDelete = prompt(`Type "DELETE" to PERMANENTLY DELETE ${user.email}. This cannot be undone.`);
    if (confirmDelete === 'DELETE') {
      await this.gameService.manageAdmin(user.uid, 'delete');
      this.loadData();
    }
  }

  async viewGames(admin: any) {
    this.selectedAdmin = admin;
    this.isLoadingGames = true;
    this.adminGames = [];
    this.cdr.detectChanges();

    try {
      // Force scroll to games
      setTimeout(() => document.getElementById('games-section')?.scrollIntoView({ behavior: 'smooth' }), 100);

      const res = await this.gameService.getAdminGames(1, 100, false, admin.uid);

      this.ngZone.run(() => {
        console.log('SuperAdmin: Games loaded', res.games.length);
        this.adminGames = res.games;
        this.isLoadingGames = false;
        this.cdr.detectChanges();
      });
    } catch (e: any) {
      this.ngZone.run(() => {
        console.error(e);
        this.isLoadingGames = false;
        alert('Failed to load games');
        this.cdr.detectChanges();
      });
    }
  }

  // Delete Logic
  gameToDelete: any = null;
  isDeleting = false;
  deleteConfirmInput = '';

  async deleteGame(game: any) {
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
    } catch (e: any) {
      console.error(e);
      alert('Failed to delete: ' + e.message);
    } finally {
      this.isDeleting = false;
      this.gameToDelete = null;
      this.deleteConfirmInput = '';
      this.cdr.detectChanges();
    }
  }

  isTrash(game: any): boolean {
    return game?.status === 'deleted' || !!game?.deletedAt;
  }
}
