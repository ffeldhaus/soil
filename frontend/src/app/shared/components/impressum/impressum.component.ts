// File: frontend/src/app/shared/components/impressum/impressum.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
// import { FlexLayoutModule } from '@angular/flex-layout'; // Flex Layout is not typically used in newer Angular versions, use CSS flexbox/grid instead

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    // FlexLayoutModule // Removed, will use CSS for layout
  ],
  templateUrl: './impressum.component.html',
  styleUrls: ['./impressum.component.scss']
})
export class ImpressumComponent {

}
