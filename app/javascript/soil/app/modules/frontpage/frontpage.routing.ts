import {Routes, RouterModule} from '@angular/router';

import {FrontpageComponent} from './frontpage.component';
import {OverviewComponent} from './components/overview.component';
import {BackgroundComponent} from './components/background.component';
import {LoginComponent} from './components/login.component';
import {RegisterComponent} from './components/register.component';

import {ImpressumComponent} from '../../shared/components/impressum.component';
import {PrivacyComponent} from '../../shared/components/privacy.component';


const frontpageRoutes: Routes = [
  {
    path: '',
    component: FrontpageComponent,
    children: [
      {
        path: 'overview',
        component: OverviewComponent,
      },
      {
        path: 'background',
        component: BackgroundComponent,
      },
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: 'register',
        component: RegisterComponent,
      },
      {
        path: 'impressum',
        component: ImpressumComponent,
      },
      {
        path: 'privacy',
        component: PrivacyComponent,
      }
    ]
  }
];

export const FrontpageRouting = RouterModule.forChild(frontpageRoutes);