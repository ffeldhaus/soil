import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";

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
  }

  round;
  field;
  rounds;

  ngOnInit() {
    console.log("Initializing round");
    // game is already loaded via resolver
    this.round = new Round(this.route.snapshot.data.round.attributes);
    this.field = new Field(this.route.snapshot.data.round.relationships.field.data);
    if (!this.router.url.includes('field')) {
      this.router.navigate(['field', this.field.id], {relativeTo: this.route})
    }
    this.rounds = this.route.parent.snapshot.data.player.included.filter(included => included.type === "round").map(
        data => {
          let round = new Round(data.attributes);
          round.fieldId = data.relationships.field.data.id;
          round.resultId = data.relationships.result.data.id;
          return round;
        });
  }
}