import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button/back-button';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink, BackButtonComponent],
  templateUrl: './privacy.html',
})
export class PrivacyPolicyComponent {}
