export class RunningCost {
  id: string;
  type: string;
  sum: number;
  organic_control: number;
  fertilize: number;
  pesticide: number;
  organisms: number;
  animals: number;
  base: number;

  constructor(fields:Partial<RunningCost>) {
    Object.assign(this, fields);
  }
}