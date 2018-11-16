import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

import templateString from './new-round-dialog.component.html';

import {Result} from "../models/result.model";

export interface DialogData {
  result: Result;
}

@Component({
  template: templateString
})
export class NewRoundDialogComponent {

  constructor(
      public dialogRef: MatDialogRef<NewRoundDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: DialogData) {
  }

  result = this.data.result;
}