import {Component, OnInit} from '@angular/core';
import {MatDialog, MatTabChangeEvent} from '@angular/material';
import {ActivatedRoute, Router} from "@angular/router";

import {timer} from 'rxjs';
import {concatMap, filter, take, flatMap, map} from "rxjs/operators";

import templateString from './player.component.html';

import {EndRoundDialogComponent} from "./end-round-dialog.component";

import {Player} from "../models/player.model";
import {Round} from "../models/round.model";
import {User} from "../models/user.model";
import {Response} from "../models/response.model";
import {AuthenticationService} from "../../shared/services/authentication.service";
import {RoundService} from "../services/round.service";
import {NewRoundDialogComponent} from "./new-round-dialog.component";
import {EndGameDialogComponent} from "./end-game-dialog.component";
import {ResultService} from "../services/result.service";
import {Result} from "../models/result.model";
import {Income} from "../models/income.model";
import {Harvest} from "../models/harvest.model";
import {Expense} from "../models/expense.model";
import {Seed} from "../models/seed.model";
import {Investment} from "../models/investment.model";
import {RunningCost} from "../models/running-cost.model";

@Component({
  template: templateString
})
export class PlayerComponent implements OnInit {
  constructor(
      private router: Router,
      private route: ActivatedRoute,
      private authenticationService: AuthenticationService,
      private roundService: RoundService,
      private resultService: ResultService,
      public dialog: MatDialog
  ) {
  }

  currentUser: User;
  player;
  rounds;
  result;
  selectedRound: Round;
  timer;
  submitted;
  display;

  ngOnInit() {
    this.display = 'field';
    this.timer = timer(0, 10000);

    this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));

    // game is already loaded via resolver
    this.player = new Player(this.route.snapshot.data.player.data.attributes);
    this.rounds = this.route.snapshot.data.player.included.filter(included => included.type === "round").map(
        data => {
          let round = new Round(data.attributes);
          round.fieldId = data.relationships.field.data.id;
          round.resultId = data.relationships.result.data.id;
          if (round.last) {
            round.name = 'Spielende'
          }
          else {
            round.name = 'Runde ' + round.number
          }
          return round;
        });

    if (this.rounds.every(round => round.submitted)) {
      this.submitted = true;
      this.waitForNewRound();
    }

    // TODO: improve retrieving result
    this.result = this.resultService.getResult(this.rounds[this.rounds.length - 1].resultId).subscribe(
        response => {
          let result = new Result(response.data.attributes);
          let income = response.included.find(included => included.type === "income" && included.id === response.data.relationships.income.data.id);
          result.income = new Income(income.attributes);
          let harvest = response.included.find(included => included.type === "harvest" && included.id === income.relationships.harvest.data.id);
          result.income.harvest = new Harvest(harvest.attributes);
          let expense = response.included.find(included => included.type === "expense" && included.id === response.data.relationships.expense.data.id);
          result.expense = new Expense(expense.attributes);
          let seed = response.included.find(included => included.type === "seed" && included.id === expense.relationships.seed.data.id);
          result.expense.seed = new Seed(seed.attributes);
          let investment = response.included.find(included => included.type === "investment" && included.id === expense.relationships.investment.data.id);
          result.expense.investment = new Investment(investment.attributes);
          let running_cost = response.included.find(included => included.type === "running_cost" && included.id === expense.relationships.running_cost.data.id);
          result.expense.running_cost = new RunningCost(running_cost.attributes);
          let round = response.included.find(included => included.type === "round" && included.id === response.data.relationships.round.data.id);
          result.round = new Round(round.attributes);

          round = this.rounds[this.rounds.length - 1];

          if (!round.confirmed) {
            if (round.last) {
              this.endGame(result)
            }
            else {
              this.startNewRound(result)
            }
          }
          this.router.navigate(['round', round.id], {relativeTo: this.route});
        });

    this.selectedRound = this.rounds[this.rounds.length - 1];
    this.router.navigate(['round', this.selectedRound.id], {relativeTo: this.route})
  }

  endRound() {
    if (!this.selectedRound.submitted) {
      const dialogRef = this.dialog.open(EndRoundDialogComponent, {
        data: {round: this.rounds[this.rounds.length - 1]}
      });

      dialogRef.afterClosed().subscribe(round => {
        if (round instanceof Round) {
          round.submitted = true;
          this.roundService.updateRound(round).subscribe(
              response => {
                this.rounds[this.rounds.length - 1] = response.data.attributes;
                this.rounds[this.rounds.length - 1].fieldId = response.data.relationships.field.data.id;
                if (this.rounds[this.rounds.length - 1].last) {
                  this.rounds[this.rounds.length - 1].name = 'Spielende'
                }
                else {
                  this.rounds[this.rounds.length - 1].name = 'Runde ' + this.rounds[this.rounds.length - 1].number
                }
                this.waitForNewRound()
              },
              error => alert("Submitting decisions failed")
          );
        }
      });
    }
  }

  waitForNewRound() {
    this.timer.pipe(
//        takeWhile(this.rounds.every(round => round.submitted)),
        concatMap(_ => this.roundService.getRounds()),
        flatMap((response: Response) => response.data.map(data => {
          let round = new Round(data.attributes);
          round.fieldId = Number(data.relationships.field.data.id);
          round.resultId = Number(data.relationships.result.data.id);
          if (round.last) {
            round.name = 'Spielende'
          }
          else {
            round.name = 'Runde ' + round.number
          }
          return round;
        })),
        filter((round: Round) => !round.submitted),
        take(1)
    ).subscribe(round => {
      this.submitted = false;
      this.rounds.push(round);
      this.selectedRound = round;
      this.resultService.getResult(round.resultId).subscribe(
          response => {
            let result = new Result(response.data.attributes);
            let income = response.included.find(included => included.type === "income" && included.id === response.data.relationships.income.data.id);
            result.income = new Income(income.attributes);
            let harvest = response.included.find(included => included.type === "harvest" && included.id === income.relationships.harvest.data.id);
            result.income.harvest = new Harvest(harvest.attributes);
            let expense = response.included.find(included => included.type === "expense" && included.id === response.data.relationships.expense.data.id);
            result.expense = new Expense(expense.attributes);
            let seed = response.included.find(included => included.type === "seed" && included.id === expense.relationships.seed.data.id);
            result.expense.seed = new Seed(seed.attributes);
            let investment = response.included.find(included => included.type === "investment" && included.id === expense.relationships.investment.data.id);
            result.expense.investment = new Investment(investment.attributes);
            let running_cost = response.included.find(included => included.type === "running_cost" && included.id === expense.relationships.running_cost.data.id);
            result.expense.running_cost = new RunningCost(running_cost.attributes);
            let round = response.included.find(included => included.type === "round" && included.id === response.data.relationships.round.data.id);
            result.round = new Round(round.attributes);

            if (result.round.last) {
              this.endGame(result)
            }
            else {
              this.startNewRound(result)
            }
            this.router.navigate(['round', this.rounds[this.rounds.length-1].id, 'field', this.rounds[this.rounds.length-1].fieldId], {relativeTo: this.route});
          });
    });
  }

  startNewRound(result: Result) {
    const dialogRef = this.dialog.open(NewRoundDialogComponent, {
      width: '80%',
      maxWidth: 1024,
      data: {result: result}
    });

    dialogRef.afterClosed().subscribe(result => {
      let round = this.rounds[this.rounds.length - 1];
      round.confirmed = true;
      this.roundService.updateRound(round).subscribe();
    });
  }

  endGame(result: Result) {
    const dialogRef = this.dialog.open(EndGameDialogComponent, {
      width: '80%',
      maxWidth: 1024,
      data: {result: result}
    });

    dialogRef.afterClosed().subscribe(result => {
      let round = this.rounds[this.rounds.length - 1];
      round.confirmed = true;
      this.roundService.updateRound(round).subscribe();
    });
  }

  logout(): void {
    this.authenticationService.logout();
    this.router.navigate(['/frontpage/login?gameId=' + this.currentUser.gameId])
  }
}