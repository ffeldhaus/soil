export class Investment {
  id: string;
  type: string;
  sum: number;
  animals: number;
  machines: number;

  constructor(fields:Partial<Investment>) {
    Object.assign(this, fields);
  }
}