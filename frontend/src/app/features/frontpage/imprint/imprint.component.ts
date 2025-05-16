// File: frontend/src/app/features/frontpage/imprint/imprint.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-imprint',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
  ],
  templateUrl: './imprint.component.html'
})
export class ImprintComponent {

}
