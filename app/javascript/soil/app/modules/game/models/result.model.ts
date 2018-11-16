import {Income} from "./income.model";
import {Expense} from "./expense.model";
import {Round} from "./round.model";

export class Result {
  id: string;
  type: string;
  income: Income;
  expense: Expense;
  round: Round;
  player: string;
  profit: number;
  capital: number;
  organic: boolean;
  weather: string;
  vermin: string;
  machines: number;

  constructor(fields:Partial<Result>) {
    Object.assign(this, fields);
  }
}