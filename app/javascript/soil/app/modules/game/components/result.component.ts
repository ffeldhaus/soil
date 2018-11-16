import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";

import templateString from './result.component.html';
import {Result} from "../models/result.model";
import {Income} from "../models/income.model";
import {Expense} from "../models/expense.model";
import {Harvest} from "../models/harvest.model";
import {Investment} from "../models/investment.model";
import {Seed} from "../models/seed.model";
import {RunningCost} from "../models/running-cost.model";
import {Round} from "../models/round.model";

@Component({
  template: templateString
})
export class ResultComponent implements OnInit {

  navigationSubscription;
  constructor(
      private router: Router,
      private route: ActivatedRoute
  ) {}

  results;
  lastRoundWithResults;
  roundsWithResults;
  selectedRound;

  ngOnInit() {
    console.log("Initializing result");
    this.results = this.route.snapshot.data.results.data.map(data => {
      let result = new Result(data.attributes);
      let income = this.route.snapshot.data.results.included.find(included => included.type === "income" && included.id === data.relationships.income.data.id);
      result.income = new Income(income.attributes);
      let harvest = this.route.snapshot.data.results.included.find(included => included.type === "harvest" && included.id === income.relationships.harvest.data.id);
      result.income.harvest = new Harvest(harvest.attributes);
      let expense = this.route.snapshot.data.results.included.find(included => included.type === "expense" && included.id === data.relationships.expense.data.id);
      result.expense = new Expense(expense.attributes);
      let seed = this.route.snapshot.data.results.included.find(included => included.type === "seed" && included.id === expense.relationships.seed.data.id);
      result.expense.seed = new Seed(seed.attributes);
      let investment = this.route.snapshot.data.results.included.find(included => included.type === "investment" && included.id === expense.relationships.investment.data.id);
      result.expense.investment = new Investment(investment.attributes);
      let running_cost = this.route.snapshot.data.results.included.find(included => included.type === "running_cost" && included.id === expense.relationships.running_cost.data.id);
      result.expense.running_cost = new RunningCost(running_cost.attributes);
      let round = this.route.snapshot.data.results.included.find(included => included.type === "round" && included.id === data.relationships.round.data.id);
      result.round = new Round(round.attributes);
      return result;
    });
    this.roundsWithResults = this.route.parent.snapshot.data.player.included.filter(included => included.type === "round" && included.attributes.submitted).map(
        data => {
          let round = new Round(data.attributes);
          round.fieldId = data.relationships.field.data.id;
          round.resultId = data.relationships.result.data.id;
          return round;
        });
    this.selectedRound = this.roundsWithResults[this.roundsWithResults.length - 1];
  }

  resultsOfSelectedRound() {
    return this.results.filter(result => result.round.number === this.selectedRound.number);
  }
}