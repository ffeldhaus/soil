import {
  Component,
  OnInit
} from '@angular/core';

import {
  ActivatedRoute,
  Router
} from "@angular/router";

import {AuthenticationService} from "../shared/services/authentication.service";

import templateString from './game.component.html'

import {User} from './models/user.model'
import {Player} from './models/player.model'
import {Game} from "./models/game.model";
import {Round} from "./models/round.model";
import {PlayerService} from "./services/player.service";
import {RoundService} from "./services/round.service";

@Component({
  template: templateString,
})
export class GameComponent implements OnInit {
  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private authenticationService: AuthenticationService,
      private playerService: PlayerService,
      private roundService: RoundService
  ) {
  }

  currentUser: User;
  selectedRound;
  game: Game;
  player: Player;
  rounds: Round[] = [];

  ngOnInit() {
    this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));
    this.selectedRound = 1;

    // game is already loaded via resolver
    this.game = new Game(this.route.snapshot.data.game.attributes);

    this.router.navigate(['player', this.currentUser.id], {relativeTo: this.route})
  }

  logout(): void {
    this.authenticationService.logout();
    this.router.navigate(['/frontpage/login?gameId=' + this.currentUser.gameId])
  }
/*
  private loadPlayer(id: number) {
    this.playerService.getPlayer(id).subscribe(
        response => {
          this.player = new Player(response.data.attributes);
          response.data.relationships.rounds.data.map(round => {
            this.loadRound(round.id)
          });
        },
        error => console.error(error)
    );
  }

  private loadRound(id: number) {
    this.roundService.getRound(id).subscribe(
        response => {
          let round = new Round(response.data.attributes);
          round.fieldId = response.data.relationships.field.data.id;
          round.decisionId = response.data.relationships.decision.data.id;
          round.resultId = response.data.relationships.result.data.id;
          this.rounds.push(round);
        },
        error => console.error(error)
    );
  }*/
}