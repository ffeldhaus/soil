import {Component, OnInit} from '@angular/core';
import {MatTabChangeEvent} from '@angular/material';

import templateString from './player.component.html';

import {Player} from "../models/player.model";
import {Round} from "../models/round.model";

import {ActivatedRoute, Router} from "@angular/router";

@Component({
  template: templateString
})
export class PlayerComponent implements OnInit {
  constructor(
      private router: Router,
      private route: ActivatedRoute
  ) {
  }

  player;
  rounds;
  selectedRound: Round;

  roundChanged(tabChangeEvent: MatTabChangeEvent) {
    this.selectedRound = this.rounds[tabChangeEvent.index];
  }

  ngOnInit() {
    // game is already loaded via resolver
    this.player = new Player(this.route.snapshot.data.player.data.attributes);
    this.rounds = this.route.snapshot.data.player.included.map(data => {
      let round = new Round(data.attributes);
      round.fieldId = data.relationships.field.data.id;
      return round;
    });
    this.selectedRound = this.rounds[0];
    this.router.navigate(['round', this.selectedRound.id], {relativeTo: this.route})
  }
}