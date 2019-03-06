import {Routes, RouterModule} from '@angular/router';
import { GameAuthGuard } from './guards/game-auth.guard';
import { AppAuthGuard } from './guards/app-auth.guard';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AppComponent } from './app.component';

const appRoutes: Routes = [
  {
    path: 'game/:id',
    loadChildren: './modules/game/game.module#GameModule',
    canActivate: [GameAuthGuard]
  },
  {
    path: 'admin/:id',
    loadChildren: './modules/admin/admin.module#AdminModule',
    canActivate: [AdminAuthGuard],
  },
  {
    path: 'frontpage',
    loadChildren: './modules/frontpage/frontpage.module#FrontpageModule'
  },
  {
    path: '**',
    canActivate: [AppAuthGuard],
    component: AppComponent
  }
];

export const AppRouting = RouterModule.forRoot(appRoutes);