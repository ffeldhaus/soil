import type { Routes } from '@angular/router';

const baseRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./landing/landing').then((m) => m.Landing),
  },
  {
    path: 'game',
    loadComponent: () => import('./game/board/board').then((m) => m.Board),
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./auth/admin-login/admin-login').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin/register',
    loadComponent: () => import('./auth/admin-register/admin-register').then((m) => m.AdminRegisterComponent),
  },
  {
    path: 'admin/super',
    loadComponent: () => import('./admin/super-admin/super-admin').then((m) => m.SuperAdminComponent),
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'auth/action',
    loadComponent: () => import('./auth/auth-action/auth-action').then((m) => m.AuthActionComponent),
  },
  {
    path: '_/auth/action',
    loadComponent: () => import('./auth/auth-action/auth-action').then((m) => m.AuthActionComponent),
  },
  {
    path: '__/auth/action',
    loadComponent: () => import('./auth/auth-action/auth-action').then((m) => m.AuthActionComponent),
  },
  {
    path: 'game-login',
    loadComponent: () => import('./auth/player-login/player-login').then((m) => m.PlayerLoginComponent),
  },
  {
    path: 'impressum',
    loadComponent: () => import('./impressum/impressum').then((m) => m.ImpressumComponent),
  },
  {
    path: 'manual',
    loadComponent: () => import('./manual/manual').then((m) => m.ManualComponent),
  },
  {
    path: 'info',
    loadComponent: () => import('./info/info').then((m) => m.InfoComponent),
  },
];

export const routes: Routes = [...baseRoutes];
