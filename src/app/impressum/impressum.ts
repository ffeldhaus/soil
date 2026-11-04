import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button/back-button';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [RouterLink, BackButtonComponent],
  templateUrl: './impressum.html',
})
export class ImpressumComponent {
  year = new Date().getFullYear();
}
