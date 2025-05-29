import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';

// Import Angular Material modules used by the component
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';

import { PlantationDialogComponent } from './plantation-dialog.component';
import { PlantationType } from '../../../../core/models/parcel.model';
import { DisplayPlantationNamePipe } from '../../../../shared/pipes/display-plantation-name.pipe'; // Import the pipe

// Mock MAT_DIALOG_DATA - even if not used by current component logic, it's good practice if dialogs often expect it.
// For this component, it seems it doesn't use injected data to populate its list of plantations.
const mockDialogData = { 
  // parcelNumber: 1, // Example data, though not used by this specific component's logic
  // currentPlantation: PlantationType.CORN // Also not directly used to filter or select
};

describe('PlantationDialogComponent', () => {
  let component: PlantationDialogComponent;
  let fixture: ComponentFixture<PlantationDialogComponent>;
  let dialogRefMock: { close: jest.Mock };
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    dialogRefMock = {
      close: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [
        CommonModule, // For *ngFor etc.
        NoopAnimationsModule,
        MatDialogModule, // Provides MatDialogRef, MAT_DIALOG_DATA implicitly
        MatButtonModule,
        MatGridListModule,
        PlantationDialogComponent, // The standalone component itself
        DisplayPlantationNamePipe  // The pipe used by the component
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlantationDialogComponent);
    component = fixture.componentInstance;
    nativeElement = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display a button for each plantation type', () => {
    const expectedPlantations = Object.values(PlantationType);
    const plantationButtons = nativeElement.querySelectorAll<HTMLButtonElement>('.plantation-button');
    expect(plantationButtons.length).toBe(expectedPlantations.length);

    // Check if button text is correctly transformed by DisplayPlantationNamePipe
    // This requires DisplayPlantationNamePipe to be correctly mocked or included if it's simple
    // For now, we check if buttons are present. Content check can be more involved.
    plantationButtons.forEach((button, index) => {
      // To properly test the text, we'd need an instance of the pipe or a more complex setup.
      // For now, let's assume the pipe works and buttons are rendered.
      expect(button).toBeTruthy();
    });
  });
  
  it('should call dialogRef.close with the selected plantation when a plantation button is clicked', () => {
    const cornButton = nativeElement.querySelector<HTMLButtonElement>('button[mat-button].plantation-button'); // Get the first button
    
    // Find a specific plantation to test, e.g., CORN
    // This depends on the order, which is not ideal. A better way would be to add data-testid attributes.
    // For now, let's assume CORN is one of the displayed buttons.
    // We'll simulate a click on the button corresponding to PlantationType.CORN
    // This requires knowing which button corresponds to CORN, or adding test IDs.

    // Let's find the button for CORN more reliably if possible, or pick the first one.
    // Assuming the buttons are rendered in the order of Object.values(PlantationType)
    const cornIndex = Object.values(PlantationType).indexOf(PlantationType.CORN);
    const plantationButtons = nativeElement.querySelectorAll<HTMLButtonElement>('.plantation-button');
    
    if (plantationButtons.length > cornIndex && cornIndex !== -1) {
      plantationButtons[cornIndex].click();
      expect(dialogRefMock.close).toHaveBeenCalledWith(PlantationType.CORN);
    } else {
      fail('Could not find a button for PlantationType.CORN to test click');
    }
  });

  it('should generate correct CSS class for a plantation type', () => {
    expect(component.getPlantationCssClass(PlantationType.FIELD_BEAN)).toBe('ackerbohne'); // Enum value is "Ackerbohne"
    expect(component.getPlantationCssClass(PlantationType.SUGAR_BEET)).toBe('zuckerruebe'); // Enum value is "Zuckerruebe"
  });
  
  // Test for a plantation type that might have underscore in its enum value if that was the case
  // Example: if PlantationType had SOME_VALUE = "SOME_VALUE"
  // it('should generate correct CSS class for plantation type with underscore', () => {
  //   enum TestPlantationType { TEST_PLANT = "TEST_PLANT" }
  //   expect(component.getPlantationCssClass(TestPlantationType.TEST_PLANT as any)).toBe('test-plant');
  // });


  it('should have a list of plantations available from PlantationType enum', () => {
    expect(component.plantations.length).toEqual(Object.values(PlantationType).length);
    expect(component.plantations).toEqual(expect.arrayContaining(Object.values(PlantationType)));
  });

});
