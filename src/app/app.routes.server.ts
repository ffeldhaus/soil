import { RenderMode, type ServerRoute } from '@angular/ssr';

export const PRERENDERED_ROUTE_PATHS = [
  '',
  'trailer',
  'manual',
  'info',
  'research',
  'admin',
  'admin/login',
  'admin/register',
  'game-login',
  'delete-account',
  'impressum',
  'privacy',
] as const;

export const CSR_ROUTE_PATHS = ['game', 'admin/super', 'auth/action', '_/auth/action', '__/auth/action'] as const;

export const serverRoutes: ServerRoute[] = [
  ...PRERENDERED_ROUTE_PATHS.map(
    (path): ServerRoute => ({
      path,
      renderMode: RenderMode.Prerender,
    }),
  ),
  ...CSR_ROUTE_PATHS.map(
    (path): ServerRoute => ({
      path,
      renderMode: RenderMode.Client,
    }),
  ),
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
