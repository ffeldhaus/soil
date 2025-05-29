import { Component, Inject, inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider'; // For machine_investment_level

import { RoundDecisionBase } from '../../../../core/models/round.model';

export interface EndRoundDialogData {
  roundDecisions: RoundDecisionBase;
}

@Component({
  selector: 'app-end-round-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSliderModule
  ],
  templateUrl: './end-round-dialog.component.html', // To be created
  styleUrls: ['./end-round-dialog.component.scss'] // To be created or if exists
})
export class EndRoundDialogComponent {
  private fb = inject(FormBuilder);
  decisionsForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<EndRoundDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EndRoundDialogData
  ) {
    this.decisionsForm = this.fb.group({
      fertilize: [data.roundDecisions.fertilize || false],
      pesticide: [data.roundDecisions.pesticide || false],
      biologicalControl: [data.roundDecisions.biologicalControl || false],
      attemptOrganicCertification: [data.roundDecisions.attemptOrganicCertification || false],
      machineInvestmentLevel: [
        data.roundDecisions.machineInvestmentLevel || 0, 
        [Validators.min(0), Validators.max(50)]
      ]
    });
  }

  onConfirm(): void {
    if (this.decisionsForm.valid) {
      this.dialogRef.close(this.decisionsForm.value as RoundDecisionBase);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
