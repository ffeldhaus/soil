export class Round {
  id: string;
  type: string;
  number: number;
  name: string;
  submitted: boolean;
  machines: number = 0;
  organic: boolean;
  pesticide: boolean;
  fertilize: boolean;
  organisms: boolean;
  fieldId: number;
  resultId: number;
  confirmed: boolean;
  last: boolean;

  constructor(fields:Partial<Round>) {
    Object.assign(this, fields);
  }
}