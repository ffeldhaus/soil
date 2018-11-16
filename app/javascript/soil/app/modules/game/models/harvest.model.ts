export class Harvest {
  id: string;
  type: string;
  sum: number;
  fieldbean: number;
  barley: number;
  oat: number;
  potato: number;
  corn: number;
  rye: number;
  wheat: number;
  beet: number;

  constructor(fields:Partial<Harvest>) {
    Object.assign(this, fields);
  }
}