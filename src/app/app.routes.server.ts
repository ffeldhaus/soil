import { RenderMode, type ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/login',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'admin/register',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'manual',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'impressum',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'info',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'game-login',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'game',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/super',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
