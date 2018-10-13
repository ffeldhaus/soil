import {Component, OnInit} from '@angular/core';
import {MatDialog, MatTabChangeEvent} from '@angular/material';
import {ActivatedRoute, Router} from "@angular/router";

import {timer} from 'rxjs';
import {takeWhile, concatMap, map, filter, take, flatMap} from "rxjs/operators";

import templateString from './player.component.html';

import {EndRoundDialogComponent} from "./end-round-dialog.component";

import {Player} from "../models/player.model";
import {Round} from "../models/round.model";
import {User} from "../models/user.model";
import {Response} from "../models/response.model";
import {AuthenticationService} from "../../shared/services/authentication.service";
import {RoundService} from "../services/round.service";

@Component({
  template: templateString
})
export class PlayerComponent implements OnInit {
  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private authenticationService: AuthenticationService,
      private roundService: RoundService,
      public dialog: MatDialog
  ) {
  }

  currentUser: User;
  player;
  rounds;
  selectedRound: Round;
  timer;
  submitted;

  ngOnInit() {
    this.timer = timer(0, 10000);

    this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));

    // game is already loaded via resolver
    this.player = new Player(this.route.snapshot.data.player.data.attributes);
    this.rounds = this.route.snapshot.data.player.included.map(data => {
      let round = new Round(data.attributes);
      round.fieldId = data.relationships.field.data.id;
      round.resultId = data.relationships.result.data.id;
      return round;
    });
    if (this.rounds.every(round => round.submitted)) {
      this.submitted = true;
      this.waitForNewRound();
    }
    this.selectedRound = this.rounds[this.rounds.length - 1];
    this.router.navigate(['round', this.selectedRound.id], {relativeTo: this.route})
  }

  endRound() {
    if (!this.selectedRound.submitted) {
      const dialogRef = this.dialog.open(EndRoundDialogComponent, {
        data: {round: this.rounds[this.rounds.length - 1]}
      });

      dialogRef.afterClosed().subscribe(round => {
        console.log('The dialog was closed with result', round);
        if (round instanceof Round) {
          round.submitted = true;
          this.roundService.updateRound(round).subscribe(
              response => {
                console.log(response);
                this.rounds[this.rounds.length - 1] = response.data.attributes;
                this.waitForNewRound()
              },
              error => alert("Submitting decisions failed")
          );
        }
      });
    }
  }

  waitForNewRound() {
    console.log("inside wait for new round");
    this.timer.pipe(
//        takeWhile(this.rounds.every(round => round.submitted)),
        concatMap(_ => this.roundService.getRounds()),
        flatMap((response: Response) => response.data.map(data => {
          let round = new Round(data.attributes);
          round.fieldId = data.relationships.field.data.id;
          round.resultId = data.relationships.result.data.id;
          return round;
        })),
        filter((round: Round) => !round.submitted),
        take(1)
    ).subscribe(round => {
      this.submitted = false;
      console.log("finished polling with result", round);
      this.rounds.push(round);
      this.selectedRound = round;
    });
  }

  logout(): void {
    this.authenticationService.logout();
    this.router.navigate(['/frontpage/login?gameId=' + this.currentUser.gameId])
  }
}