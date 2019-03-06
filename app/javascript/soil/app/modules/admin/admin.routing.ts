import {Routes, RouterModule} from '@angular/router';

import {AdminComponent} from './admin.component';

import {ImpressumComponent} from '../shared/components/impressum.component';
import {PrivacyComponent} from '../shared/components/privacy.component';


const adminRoutes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
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

export const AdminRouting = RouterModule.forChild(adminRoutes);