import {Harvest} from "./harvest.model";

export class Income {
  id: string;
  type: string;
  sum: string;
  harvest: Harvest;

  constructor(fields:Partial<Income>) {
    Object.assign(this, fields);
  }
}