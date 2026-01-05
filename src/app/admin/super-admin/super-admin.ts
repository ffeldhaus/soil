import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { AuthService } from '../../auth/auth.service';
import { GameService } from '../../game/game.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher';

@Component({
  selector: 'app-super-admin',
  standalone: true,
  imports: [TranslocoPipe, CommonModule, FormsModule, LanguageSwitcherComponent],
  template: `
    <div class="bg-gray-900 text-white font-sans min-h-screen">
      <!-- Top HUD Bar -->
      <div
        class="fixed top-0 left-0 right-0 z-50 bg-gray-900/90 border-b border-gray-700 backdrop-blur shadow-lg px-6 py-3 flex items-center justify-between"
      >
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold font-serif text-purple-500 tracking-wider">
            {{ 'superadmin.title' | transloco }}
          </h1>
        </div>

        <div class="flex items-center gap-3">
          <div *ngIf="authService.user$ | async as user" class="flex items-center gap-3">
            <img [src]="user.photoURL" class="w-8 h-8 rounded-full border border-gray-600" />
            <span class="text-sm font-medium text-gray-300 hidden md:block">{{ user.displayName }}</span>
            <span
              class="px-2 py-0.5 rounded text-[10px] bg-purple-900 text-purple-300 font-bold uppercase tracking-wider border border-purple-700"
              >{{ 'superadmin.badge' | transloco }}</span
            >
          </div>

          <app-language-switcher></app-language-switcher>

          <button
            (click)="logout()"
            class="p-2 hover:bg-gray-800 rounded-lg text-red-400 hover:text-red-200 transition"
            title="Logout"
            [title]="'superadmin.logout' | transloco"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Main Content -->
      <div class="pt-24 px-4 max-w-7xl mx-auto space-y-12 pb-12 relative">
        <!-- Loading Overlay -->
        <div
          *ngIf="isLoadingData"
          class="absolute inset-0 z-40 bg-gray-900/50 backdrop-blur-sm flex items-start justify-center pt-20 animate-fade-in rounded-xl"
        >
          <div class="flex flex-col items-center gap-3 bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
            <svg
              class="animate-spin h-10 w-10 text-emerald-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span class="text-emerald-400 font-bold animate-pulse">{{ 'superadmin.loading' | transloco }}</span>
          </div>
        </div>

        <header class="flex justify-between items-center">
          <div class="space-y-1">
            <h2 class="text-3xl font-bold text-white">{{ 'superadmin.dashboard.title' | transloco }}</h2>
            <p class="text-gray-400 text-sm">{{ 'superadmin.dashboard.subtitle' | transloco }}</p>
          </div>
          <button
            (click)="loadData()"
            class="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-sm font-bold transition flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <ng-container>{{ 'superadmin.dashboard.refresh' | transloco }}</ng-container>
          </button>
        </header>

        <!-- Stats Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" *ngIf="stats">
          <!-- Total Games -->
          <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
            <div class="absolute top-0 right-0 p-4 opacity-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-24 w-24 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 class="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">
              {{ 'superadmin.stats.totalGames' | transloco }}
            </h3>
            <div class="flex items-end gap-2">
              <span class="text-4xl font-bold text-white">{{ stats.games.total }}</span>
              <span class="text-sm text-gray-400 mb-1">{{ 'superadmin.stats.created' | transloco }}</span>
            </div>
            <div class="mt-4 flex gap-4 text-xs font-mono">
              <span class="text-emerald-400"
                ><ng-container>{{ 'superadmin.stats.active' | transloco }}</ng-container></span
              >
              <span class="text-red-400">{{ stats.games.deleted }} Trash</span>
            </div>
          </div>

          <!-- Total Users -->
          <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg relative overflow-hidden">
            <div class="absolute top-0 right-0 p-4 opacity-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-24 w-24 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            <h3 class="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Total Users</h3>
            <div class="flex items-end gap-2">
              <span class="text-4xl font-bold text-white">{{ stats.users.total }}</span>
              <span class="text-sm text-gray-400 mb-1">registered</span>
            </div>
            <div class="mt-4 flex gap-4 text-xs font-mono">
              <span class="text-purple-400">{{ stats.users.admins }} Admins</span>
              <span class="text-yellow-400">{{ stats.users.pending }} Pending</span>
            </div>
          </div>
        </div>

        <!-- Pending Users Section -->
        <section *ngIf="pendingUsers.length > 0" class="space-y-4 animate-fade-in">
          <h2 class="text-2xl font-bold text-yellow-500 flex items-center gap-2">
            <div class="p-2 bg-yellow-900/30 rounded-full">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            Pending Approvals ({{ pendingUsers.length }})
          </h2>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div
              *ngFor="let user of pendingUsers"
              class="bg-gray-800 p-6 rounded-xl border border-yellow-500/30 shadow-lg hover:border-yellow-500/50 transition"
            >
              <div class="flex justify-between items-start mb-4">
                <div class="overflow-hidden">
                  <h3 class="font-bold text-lg text-white truncate" title="{{ user.email }}">{{ user.email }}</h3>
                  <span class="text-xs text-gray-500 font-mono truncate block" title="{{ user.uid }}"
                    >UID: {{ user.uid }}</span
                  >
                </div>
                <span
                  class="px-2 py-1 bg-yellow-900/50 text-yellow-200 text-xs rounded border border-yellow-700 flex-shrink-0"
                  >Pending</span
                >
              </div>

              <div class="space-y-2 text-sm text-gray-300 mb-6 bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                <p class="flex flex-col">
                  <strong class="text-gray-500 text-xs uppercase tracking-wide mb-1">Institution</strong>
                  {{ user.onboarding?.institution }}
                </p>
                <p class="flex flex-col">
                  <strong class="text-gray-500 text-xs uppercase tracking-wide mb-1">Website</strong>
                  <a
                    [href]="user.onboarding?.institutionLink"
                    target="_blank"
                    class="text-blue-400 hover:underline truncate block"
                    >{{ user.onboarding?.institutionLink }}</a
                  >
                </p>
                <p class="flex flex-col">
                  <strong class="text-gray-500 text-xs uppercase tracking-wide mb-1">Why Soil?</strong>
                  <span class="italic text-gray-400">"{{ user.onboarding?.explanation }}"</span>
                </p>
              </div>

              <div class="flex gap-3">
                <button
                  (click)="initiateApprove(user)"
                  class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-lg"
                >
                  Approve
                </button>
                <button
                  (click)="rejectUser(user)"
                  class="flex-1 py-2 bg-red-900/50 border border-red-700 hover:bg-red-900 text-red-200 font-bold rounded-lg transition"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- All Admins Section -->
        <section class="space-y-4">
          <h2 class="text-2xl font-bold text-blue-400 flex items-center gap-2">
            <div class="p-2 bg-blue-900/30 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
            Game Administrators
          </h2>
          <div class="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead class="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th class="p-4 font-medium">Email / User</th>
                    <th class="p-4 font-medium">Role</th>
                    <th class="p-4 font-medium">Status</th>
                    <th class="p-4 font-medium">Quota</th>
                    <th class="p-4 font-medium">Games Created</th>
                    <th class="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-700 text-sm">
                  <tr *ngFor="let admin of admins" class="hover:bg-gray-700/30 transition group">
                    <td class="p-4">
                      <div class="font-bold text-white">{{ admin.email }}</div>
                      <div class="text-xs text-gray-500 font-mono">{{ admin.uid }}</div>
                    </td>
                    <td class="p-4">
                      <span
                        class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                        [ngClass]="{
                          'bg-purple-900/20 text-purple-300 border-purple-800': admin.role === 'superadmin',
                          'bg-blue-900/20 text-blue-300 border-blue-800': admin.role === 'admin',
                          'bg-yellow-900/20 text-yellow-300 border-yellow-800': admin.role === 'pending',
                        }"
                      >
                        {{ admin.role | titlecase }}
                      </span>
                    </td>
                    <td class="p-4">
                      <div class="flex items-center gap-2">
                        <span
                          class="h-2 w-2 rounded-full"
                          [ngClass]="{
                            'bg-emerald-500': admin.status === 'active',
                            'bg-red-500': admin.status === 'rejected',
                            'bg-yellow-500': admin.status === 'pending',
                            'bg-gray-500': admin.status === 'banned',
                          }"
                        ></span>
                        <span class="text-gray-300">{{ admin.status | titlecase }}</span>
                      </div>
                    </td>
                    <td class="p-4">
                      <div class="flex items-center gap-2">
                        <div class="w-full bg-gray-700 rounded-full h-1.5 w-16">
                          <div
                            class="bg-blue-500 h-1.5 rounded-full"
                            [style.width.%]="(admin.gameCount / admin.quota) * 100"
                          ></div>
                        </div>
                        <span class="text-xs text-gray-400">{{ admin.gameCount }}/{{ admin.quota }}</span>
                      </div>
                    </td>
                    <td class="p-4 text-gray-300">
                      {{ admin.gameCount }}
                    </td>
                    <td
                      class="p-4 text-right flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition"
                    >
                      <ng-container *ngIf="admin.role !== 'superadmin'">
                        <button
                          (click)="viewGames(admin)"
                          class="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition border border-gray-600"
                        >
                          Games
                        </button>
                        <button
                          (click)="setQuota(admin)"
                          class="px-2 py-1 bg-gray-700 hover:emerald-800 text-gray-300 rounded text-xs transition border border-gray-600"
                          title="Edit Quota"
                        >
                          Quota
                        </button>
                        <button
                          (click)="banAdmin(admin)"
                          class="px-2 py-1 bg-gray-700 hover:bg-orange-900 text-orange-200 rounded text-xs transition border border-gray-600"
                          title="Ban User"
                        >
                          Ban
                        </button>
                        <button
                          (click)="deleteAdmin(admin)"
                          class="px-2 py-1 bg-gray-700 hover:bg-red-900 text-red-200 rounded text-xs transition border border-gray-600"
                          title="Delete User"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </ng-container>
                      <span *ngIf="admin.role === 'superadmin'" class="text-gray-600 italic text-xs px-2"
                        >Protected</span
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- Selected Admin Games -->
        <section *ngIf="selectedAdmin" class="pt-8 border-t border-gray-800 animate-fade-in" id="games-section">
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-emerald-900/30 rounded-full text-emerald-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 class="text-2xl font-bold text-white">
                Games by <span class="text-emerald-400">{{ selectedAdmin.email }}</span>
              </h2>
            </div>
            <button
              (click)="selectedAdmin = null"
              class="text-gray-400 hover:text-white flex items-center gap-1 text-sm bg-gray-800 px-3 py-1.5 rounded transition hover:bg-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>

          <div *ngIf="isLoadingGames" class="py-12 flex flex-col items-center justify-center text-gray-500">
            <svg
              class="animate-spin h-8 w-8 text-emerald-500 mb-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading games...
          </div>

          <div
            *ngIf="!isLoadingGames && adminGames.length === 0"
            class="p-12 bg-gray-800 rounded-xl text-center text-gray-500 border border-gray-700 border-dashed"
          >
            <p class="text-lg">No games found for this admin.</p>
          </div>

          <div
            *ngIf="!isLoadingGames && adminGames.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div
              *ngFor="let game of adminGames"
              class="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-emerald-500/50 transition shadow-lg group relative"
            >
              <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
                <button
                  (click)="deleteGame(game)"
                  class="text-red-500 hover:text-red-300 p-2 rounded hover:bg-red-900/30"
                  title="Delete Game"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              <div class="flex justify-between items-start mb-3 pr-8">
                <h3 class="font-bold text-lg text-white truncate w-full" title="{{ game.name }}">{{ game.name }}</h3>
              </div>

              <div class="text-sm text-gray-400 space-y-2 mb-4">
                <div class="flex justify-between border-b border-gray-700 pb-2 mb-2">
                  <span class="text-xs uppercase tracking-wide text-gray-500">Status</span>
                  <span
                    class="text-emerald-400 font-bold bg-emerald-900/20 px-2 py-0.5 rounded text-xs border border-emerald-900/50"
                    >{{ game.status | uppercase }}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Round</span>
                  <span class="text-white font-mono">{{ game.currentRoundNumber }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Created</span>
                  <span class="text-gray-300">{{ game.createdAt | date: 'shortDate' }}</span>
                </div>
                <div class="text-[10px] text-gray-600 font-mono mt-2 truncate bg-gray-900/50 p-1 rounded">
                  {{ game.id }}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Delete Confirmation Modal -->
        <div
          *ngIf="gameToDelete"
          class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          (click)="cancelDelete()"
        >
          <div
            class="bg-gray-800 border border-gray-700 p-6 rounded-xl flex flex-col gap-4 max-w-md w-full shadow-2xl"
            (click)="$event.stopPropagation()"
          >
            <h3
              class="text-xl font-bold flex items-center gap-2"
              [class.text-red-400]="!isTrash(gameToDelete)"
              [class.text-red-600]="isTrash(gameToDelete)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {{ isTrash(gameToDelete) ? 'Permanent Deletion' : 'Confirm Deletion' }}
            </h3>

            <p class="text-gray-300">
              Are you sure you want to {{ isTrash(gameToDelete) ? 'permanently' : '' }} delete
              <span class="font-bold text-white">{{ gameToDelete.name }}</span
              >?
            </p>

            <!-- Soft Delete Info -->
            <div
              *ngIf="!isTrash(gameToDelete)"
              class="bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex gap-3 items-start"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div class="text-sm text-red-200/80"><strong>Soft Delete:</strong> Games will be moved to the Trash.</div>
            </div>

            <!-- Permanent Delete Warning -->
            <div
              *ngIf="isTrash(gameToDelete)"
              class="bg-red-600/20 border border-red-500/50 p-3 rounded-lg flex gap-3 items-start animate-pulse-slow"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div class="text-sm text-red-200">
                <strong>WARNING:</strong> This action cannot be undone. All game data will be destroyed immediately.
              </div>
            </div>

            <!-- Type Confirmation -->
            <div *ngIf="isTrash(gameToDelete)">
              <label class="text-xs text-gray-400 block mb-1"
                >Type <span class="font-mono font-bold text-red-400">DELETE</span> to confirm:</label
              >
              <input
                [(ngModel)]="deleteConfirmInput"
                placeholder="DELETE"
                class="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-red-500 focus:outline-none placeholder-gray-600"
              />
            </div>

            <div class="flex gap-3 mt-4">
              <button
                (click)="cancelDelete()"
                class="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                (click)="confirmDelete()"
                [disabled]="isDeleting || (isTrash(gameToDelete) && deleteConfirmInput !== 'DELETE')"
                class="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-bold transition shadow-lg flex items-center justify-center gap-2"
              >
                <span *ngIf="!isDeleting">{{ isTrash(gameToDelete) ? 'Permanently Delete' : 'Delete Game' }}</span>
                <span
                  *ngIf="isDeleting"
                  class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                ></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Quota Modal -->
        <div *ngIf="showQuotaModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <!-- Modal Backdrop -->
          <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="closeQuotaModal()"></div>

          <!-- Modal Content -->
          <div
            class="relative bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md overflow-hidden transform transition-all scale-100"
          >
            <div class="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <h3 class="text-xl font-bold text-white flex items-center gap-2">
                <div class="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                </div>
                Set Game Quota
              </h3>
              <button (click)="closeQuotaModal()" class="text-gray-400 hover:text-white transition">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="p-6 space-y-4">
              <p class="text-gray-400 text-sm">
                Set the maximum number of games allowed for
                <span class="text-white font-bold">{{ selectedUserForQuota?.email }}</span
                >.
              </p>

              <div class="space-y-2">
                <label class="block text-xs uppercase tracking-wide text-gray-500 font-bold">Quota Limit</label>
                <input
                  type="number"
                  [(ngModel)]="newQuotaValue"
                  min="0"
                  class="w-full bg-gray-800 border-2 border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none transition mb-2 text-lg font-mono"
                />
              </div>
            </div>

            <div class="p-6 bg-gray-800/50 border-t border-gray-800 flex justify-end gap-3">
              <button
                (click)="closeQuotaModal()"
                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                (click)="saveQuota()"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:shadow-blue-500/20 transition flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Save
              </button>
            </div>
          </div>
        </div>

        <!-- Approval Confirmation Modal -->
        <div *ngIf="userToApprove" class="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" (click)="cancelApprove()"></div>
          <div
            class="relative bg-gray-800 border border-emerald-500/50 p-6 rounded-xl flex flex-col gap-4 max-w-sm w-full shadow-2xl"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center gap-3 text-emerald-400 mb-2">
              <div class="p-2 bg-emerald-900/30 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 class="text-xl font-bold text-white">Approve User</h3>
            </div>

            <p class="text-gray-300">
              Are you sure you want to approve <span class="font-bold text-white">{{ userToApprove.email }}</span
              >?
            </p>
            <p class="text-xs text-gray-500 bg-gray-900/50 p-3 rounded border border-gray-700">
              This will grant them full administrative access to create games and manage their own students.
            </p>

            <div class="flex gap-3 mt-2">
              <button
                (click)="cancelApprove()"
                class="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                (click)="confirmApprove()"
                class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-lg flex items-center justify-center gap-2"
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SuperAdminComponent implements OnInit {
  gameService = inject(GameService);
  authService = inject(AuthService);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

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

    await this.gameService.manageAdmin(user.uid, 'approve');
    this.loadData();
  }

  // Old method kept for reference or direct calls if needed, but unused by template now
  async approveUser(user: any) {
    if (!confirm(`Approve ${user.email}?`)) return;
    await this.gameService.manageAdmin(user.uid, 'approve');
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
