import {Routes, RouterModule} from '@angular/router';

const appRoutes: Routes = [
  {
    path: 'frontpage',
    redirectTo: 'frontpage/overview'
  },
  {
    path: 'frontpage',
    loadChildren: './modules/frontpage/frontpage.module#FrontpageModule'
  },
  {
    path: 'game',
    redirectTo: 'game/overview'
  },
  {
    path: 'game',
    loadChildren: './modules/game/game.module#GameModule'
  },
  // otherwise redirect to home
  {path: '**', redirectTo: 'frontpage/overview'}
];

export const AppRouting = RouterModule.forRoot(appRoutes);