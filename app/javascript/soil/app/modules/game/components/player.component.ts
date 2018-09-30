import {Component, OnInit} from '@angular/core';

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

  ngOnInit() {
    // game is already loaded via resolver
    this.player = new Player(this.route.snapshot.data.player.data.attributes);
    this.rounds = this.route.snapshot.data.player.included.map(round => new Round(round.attributes));
    this.router.navigate(['round', this.rounds[0].id], {relativeTo: this.route})
  }
}