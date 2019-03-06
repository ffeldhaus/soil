import {
  Component,
  OnInit
} from '@angular/core';

import {
  ActivatedRoute,
  Router
} from "@angular/router";

import templateString from './game.component.html'

import {User} from '../shared/models/user.model'
import {Player} from '../shared/models/player.model'
import {Game} from "../shared/models/game.model";
import {Round} from "./models/round.model";

@Component({
  template: templateString,
})
export class GameComponent implements OnInit {
  constructor(
      private router: Router,
      private route: ActivatedRoute,
  ) {
  }

  currentUser: User;
  game: Game;
  player: Player;
  rounds: Round[] = [];

  ngOnInit() {
    this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));

    // game is already loaded via resolver
    this.game = new Game(this.route.snapshot.data.game.attributes);

    this.router.navigate(['player', this.currentUser.id], {relativeTo: this.route})
  }
}