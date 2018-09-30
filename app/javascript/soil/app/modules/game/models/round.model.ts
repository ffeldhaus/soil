export class Round {
  id: string;
  type: string;
  number: number;
  submitted: boolean;
  fieldId: number;
  decisionId: number;
  resultId: number;

  constructor(fields:Partial<Account>) {
    Object.assign(this, fields);
  }
}