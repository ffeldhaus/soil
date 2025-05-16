import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common'; // For *ngFor
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list'; // For layout
import { PlantationType } from '../../../../core/models/parcel.model'; // Adjust path
import { DisplayPlantationNamePipe } from '../../../../shared/pipes/display-plantation-name.pipe'; // Adjust path

@Component({
  selector: 'app-plantation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatGridListModule, DisplayPlantationNamePipe],
  templateUrl: './plantation-dialog.component.html',
  styleUrls: ['./plantation-dialog.component.scss'] 
})
export class PlantationDialogComponent {
  public dialogRef = inject(MatDialogRef<PlantationDialogComponent>);

  plantations: PlantationType[] = Object.values(PlantationType);

  // For CSS class generation if needed, similar to original
  getPlantationCssClass(plantation: PlantationType): string {
    return (plantation.valueOf() as string).toLowerCase().replace(/_/g, '-'); // Ensure all underscores are replaced
  }

  onPlantationSelect(plantation: PlantationType): void {
    this.dialogRef.close(plantation);
  }
}
