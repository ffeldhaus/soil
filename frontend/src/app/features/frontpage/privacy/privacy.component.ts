import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [MatCardModule, TranslateModule],
  templateUrl: './privacy.component.html'
})
export class PrivacyComponent {}