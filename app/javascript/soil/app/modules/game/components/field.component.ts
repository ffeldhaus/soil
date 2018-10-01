import {Component, Input, ViewChild, ElementRef, OnInit, AfterViewInit} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
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
export class FieldComponent implements OnInit, AfterViewInit {
  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private parcelService: ParcelService,
      public dialog: MatDialog
  ) {
  }

  @ViewChild('container') container: ElementRef;

  field;
  parcels;
  selectable;
  overlay;
  plantations: String[] = ["Brachland", "Ackerbohne","Gerste","Hafer","Kartoffel","Mais","Roggen","Tiere","Weizen","Zuckerrübe"];

  @Input() fieldId: string;

  openDialog(): void {
    const dialogRef = this.dialog.open(PlantationDialogComponent, {
      width: '80%',
      maxWidth: 1024
    });

    let selectedParcelIds = this.selectable.getSelectedItems().map(item => item.node.attributes[1].value);
    console.log("Selected parcel IDs: ", selectedParcelIds);

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed with result', result);
      if (this.plantations.includes(result)) {
        let filteredParcels = this.parcels.filter(parcel => selectedParcelIds.includes(parcel.id.toString()));
        console.log('Filtered parcels', filteredParcels);
        filteredParcels.map(parcel => {
          parcel.plantation = result;
          this.parcelService.updateParcel(parcel).subscribe(result => console.log(result));
        });
      }
    });
  }

  ngOnInit() {
    // load field data for selected round
    this.route.queryParams.subscribe(queryParams => {
      this.overlay = queryParams['overlay'];
    });
    this.field = new Field(this.route.snapshot.data.field.data.attributes);
    this.parcels = this.route.snapshot.data.field.included.map(
        parcel => new Parcel(parcel.attributes)
    ).sort(
        (a,b) => a.number-b.number
    );
  }

  selectPlantation() {
    console.log(this.selectable.getSelectedItems());
    this.openDialog();
  }

  ngAfterViewInit() {
    this.selectable = new Selectable({
      appendTo: this.container.nativeElement
    });
    this.selectable.on("selectable.end", () => this.selectPlantation());
  }
}
