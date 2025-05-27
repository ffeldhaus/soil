import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button'; // For links styled as buttons
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [RouterModule, MatCardModule, MatButtonModule, TranslateModule],
  templateUrl: './overview.component.html',
})
export class OverviewComponent {
  constructor() {}
}