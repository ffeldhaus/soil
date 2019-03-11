import {Routes, RouterModule} from '@angular/router';
import { GameAuthGuard } from './guards/game-auth.guard';
import { AppAuthGuard } from './guards/app-auth.guard';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AppComponent } from './app.component';
import {AdminModule} from "./modules/admin/admin.module";
import {GameModule} from "./modules/game/game.module";
import {FrontpageModule} from "./modules/frontpage/frontpage.module";

const appRoutes: Routes = [
  {
    path: 'game/:id',
    loadChildren: () => GameModule,
    canActivate: [GameAuthGuard]
  },
  {
    path: 'admin/:id',
    loadChildren: () => AdminModule,
    canActivate: [AdminAuthGuard],
  },
  {
    path: 'frontpage',
    loadChildren: () => FrontpageModule,
  },
  {
    path: '**',
    canActivate: [AppAuthGuard],
    component: AppComponent
  }
];

export const AppRouting = RouterModule.forRoot(appRoutes);