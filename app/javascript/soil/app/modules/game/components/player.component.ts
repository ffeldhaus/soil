import {Component, OnInit} from '@angular/core';
import {MatTabChangeEvent} from '@angular/material';
import {ActivatedRoute, Router} from "@angular/router";

import templateString from './player.component.html';

import {Player} from "../models/player.model";
import {Round} from "../models/round.model";
import {User} from "../models/user.model";
import {AuthenticationService} from "../../shared/services/authentication.service";

@Component({
  template: templateString
})
export class PlayerComponent implements OnInit {
  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private authenticationService: AuthenticationService
  ) {
  }

  currentUser: User;
  player;
  rounds;
  selectedRound: Round;

  roundChanged(tabChangeEvent: MatTabChangeEvent) {
    this.selectedRound = this.rounds[tabChangeEvent.index];
  }

  ngOnInit() {
    this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));

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

  logout(): void {
    this.authenticationService.logout();
    this.router.navigate(['/frontpage/login?gameId=' + this.currentUser.gameId])
  }
}