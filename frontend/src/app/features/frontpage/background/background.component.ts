import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './background.component.html',
})
export class BackgroundComponent {}