import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material';

import templateString from './plantation-dialog.component.html';

@Component({
  selector: 'plantation-dialog',
  template: templateString
})
export class PlantationDialogComponent {

  constructor(
      public dialogRef: MatDialogRef<PlantationDialogComponent>) {
  }

  plantations: String[] = ["Brachland", "Ackerbohne","Gerste","Hafer","Kartoffel","Mais","Roggen","Tiere","Weizen","Zuckerrübe"];
}