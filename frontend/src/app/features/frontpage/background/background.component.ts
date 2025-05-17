import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [MatCardModule, TranslateModule],
  templateUrl: './background.component.html',
})
export class BackgroundComponent {}