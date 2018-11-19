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
import {FieldService} from "../services/field.service";

@Component({
  template: templateString
})
export class FieldComponent implements OnInit, OnDestroy, AfterViewChecked {
  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private fieldService: FieldService,
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
    // TODO: Improve all of this!
    // load field data for selected round
    this.route.queryParams.subscribe(queryParams => {
      this.overlay = queryParams['overlay'];
    });
    this.route.params.subscribe(params => {
      if (!this.field || this.field.id != params['id']) {
        this.fieldService.getField(params['id']).subscribe(
            response => {
              this.field = new Field(response.data.attributes);
              this.parcels = response.included.map(
                  parcel => new Parcel(parcel.attributes)
              ).sort(
                  (a, b) => a.number - b.number
              );

              if (!this.field.submitted && !this.route.parent.snapshot.data.round.attributes.last) {
                if (this.selectable) {
                  this.selectable.destroy();
                }
                this.selectable = new Selectable();
                this.selectable.on("selectable.end", () => this.selectPlantation());
              }
            }
        )
      }
    })
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(PlantationDialogComponent, {
      width: '80%',
      maxWidth: 1024
    });

    let selectedParcelIds = this.selectable.getSelectedNodes().map(node => node.getAttribute('parcel-index'));

    dialogRef.afterClosed().subscribe(result => {
      if (this.plantations.includes(result)) {
        let filteredParcels = this.parcels.filter(parcel => selectedParcelIds.includes(parcel.id.toString()));
        filteredParcels.map(parcel => {
          parcel.plantation = result;
          this.parcelService.updateParcel(parcel).subscribe(response => {
                parcel = response.data.attributes;
              },
              error => console.log(error));
        });
      }
      this.selectable.clear();
    });
  }

  selectPlantation() {
    this.openDialog();
  }

  ngAfterViewChecked() {
    //TODO: Check if there is a better hook to identify that container has changed
    if (this.selectable) {
      this.selectable.setContainer(this.container.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.selectable) {
      this.selectable.destroy();
    }
    this.navigationSubscription.unsubscribe();
  }
}
