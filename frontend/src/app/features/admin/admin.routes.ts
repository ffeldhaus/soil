// File: frontend/src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { GameCreateComponent } from './game-create/game-create.component';
// import { GameManageComponent } from './game-manage/game-manage.component'; // For later

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent, title: 'Admin Dashboard - Soil Game' },
      { path: 'games/new', component: GameCreateComponent, title: 'Create New Game - Soil Game' },
      // { path: 'games/:gameId', component: GameManageComponent, title: 'Manage Game - Soil Game' },
    ]
  }
];