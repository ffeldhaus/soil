import {Investment} from "../models/investment.model";
import {Seed} from "../models/seed.model";
import {RunningCost} from "../models/running-cost.model";

export class Expense {
  id: string;
  type: string;
  sum: number;
  investment: Investment;
  seed: Seed;
  running_cost: RunningCost;

  constructor(fields:Partial<Expense>) {
    Object.assign(this, fields);
  }
}