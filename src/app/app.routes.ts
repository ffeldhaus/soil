import { Routes } from '@angular/router';
import { Board } from './game/board/board';
import { Dashboard } from './admin/dashboard/dashboard';
import { Landing } from './landing/landing';
import { AdminLoginComponent } from './auth/admin-login/admin-login';
import { AdminRegisterComponent } from './auth/admin-register/admin-register';
import { SuperAdminComponent } from './admin/super-admin/super-admin';
import { PlayerLoginComponent } from './auth/player-login/player-login';

import { ImpressumComponent } from './impressum/impressum';

export const routes: Routes = [
    { path: '', component: Landing },
    { path: 'game', component: Board },
    { path: 'admin/login', component: AdminLoginComponent },
    { path: 'admin/register', component: AdminRegisterComponent },
    { path: 'admin/super', component: SuperAdminComponent },
    { path: 'admin', component: Dashboard },
    { path: 'game-login', component: PlayerLoginComponent },
    { path: 'impressum', component: ImpressumComponent },
];
