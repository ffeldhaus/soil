import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

import templateString from './end-round-dialog.component.html';
import {Round} from "../models/round.model";

export interface DialogData {
  round: Round;
}

@Component({
  template: templateString
})
export class EndRoundDialogComponent {

  constructor(
      public dialogRef: MatDialogRef<EndRoundDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: DialogData) {
  }

  round = this.data.round;
}