import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from "@angular/router";

import templateString from './round.component.html';

import {Round} from "../models/round.model";
import {Field} from "../models/field.model";

@Component({
  template: templateString
})
export class RoundComponent implements OnInit {

  navigationSubscription;
  constructor(
      private router: Router,
      private route: ActivatedRoute
  ) {
    this.navigationSubscription = this.router.events.subscribe((e: any) => {
      // If it is a NavigationEnd event re-initalise the component
      if (e instanceof NavigationEnd) {
        this.ngOnInit();
      }
  })};

  round;
  field;

  ngOnInit() {
    console.log("Initializing round");
    // game is already loaded via resolver
    this.round = new Round(this.route.snapshot.data.round.attributes);
    this.field = new Field(this.route.snapshot.data.round.relationships.field.data);
    if (!this.router.url.includes('field')) {
      this.router.navigate(['field', this.field.id], {relativeTo: this.route})
    }
  }
}