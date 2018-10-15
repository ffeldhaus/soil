import {Component, Input, ViewChild, ElementRef, OnInit, OnDestroy, AfterViewChecked} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from "@angular/router";
import {MatDialog} from '@angular/material';

import Selectable from 'selectable.js';

import templateString from './field.component.html';
import './field.component.css';

import {ParcelService} from "../services/parcel.service";

import {PlantationDialogComponent} from "./plantation-dialog.component";

import {Field} from "../models/field.model";
import {Parcel} from "../models/parcel.model";

@Component({
  template: templateString
})
export class FieldComponent implements OnInit, OnDestroy, AfterViewChecked {
  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private parcelService: ParcelService,
      public dialog: MatDialog
  ) {
    this.navigationSubscription = this.router.events.subscribe((e: any) => {
      // If it is a NavigationEnd event re-initalise the component
      if (e instanceof NavigationEnd) {
        this.ngOnInit();
      }
    });
  }

  @ViewChild('container') container: ElementRef;

  navigationSubscription;
  field;
  parcels;
  selectable;
  overlay;
  plantations: String[] = ["Brachland", "Ackerbohne", "Gerste", "Hafer", "Kartoffel", "Mais", "Roggen", "Tiere", "Weizen", "Zuckerrübe"];

  @Input() fieldId: string;

  ngOnInit() {
    console.log("Initializing field");
    // TODO: Improve all of this!
    // load field data for selected round
    this.route.queryParams.subscribe(queryParams => {
      this.overlay = queryParams['overlay'];
    });
    if (this.field) {
      if (this.field.id != this.route.snapshot.data.field.data.attributes.id) {
        this.field = new Field(this.route.snapshot.data.field.data.attributes);
        this.parcels = this.route.snapshot.data.field.included.map(
            parcel => new Parcel(parcel.attributes)
        ).sort(
            (a, b) => a.number - b.number
        );
      }
    }
    else {
      this.field = new Field(this.route.snapshot.data.field.data.attributes);
      this.parcels = this.route.snapshot.data.field.included.map(
          parcel => new Parcel(parcel.attributes)
      ).sort(
          (a, b) => a.number - b.number
      );
    }

    // TODO: need a better way to handle this instead of checking for an existing object in ngOnInit
    if (this.selectable) {
      this.selectable.destroy();
    }
    this.selectable = new Selectable();
    if (!this.field.submitted) {
      console.log("initializing selectable");
      this.selectable.on("selectable.end", () => this.selectPlantation());
    }
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(PlantationDialogComponent, {
      width: '80%',
      maxWidth: 1024
    });

    let selectedParcelIds = this.selectable.getSelectedNodes().map(node => node.getAttribute('parcel-index'));
    console.log("Selected parcel IDs: ", selectedParcelIds);

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed with result', result);
      if (this.plantations.includes(result)) {
        let filteredParcels = this.parcels.filter(parcel => selectedParcelIds.includes(parcel.id.toString()));
        console.log('Filtered parcels', filteredParcels);
        filteredParcels.map(parcel => {
          parcel.plantation = result;
          this.parcelService.updateParcel(parcel).subscribe(response => {
                console.log(response);
                parcel = response.data.attributes;
              },
              error => console.log(error));
        });
      }
      this.selectable.clear();
    });
  }

  selectPlantation() {
    console.log(this.selectable.getSelectedItems());
    this.openDialog();
  }

  ngAfterViewChecked() {
    //TODO: Check if there is a better hook to identify that container has changed
    if (this.selectable) {
      this.selectable.setContainer(this.container.nativeElement);
    }
  }

  ngOnDestroy() {
    this.selectable.destroy();
    this.navigationSubscription.unsubscribe();
  }
}
