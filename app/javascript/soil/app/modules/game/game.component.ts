import {
  Component,
  OnInit
} from '@angular/core';

import {
  ActivatedRoute,
  Router
} from "@angular/router";

import templateString from './game.component.html'

import {User} from './models/user.model'
import {Player} from './models/player.model'
import {Game} from "./models/game.model";
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