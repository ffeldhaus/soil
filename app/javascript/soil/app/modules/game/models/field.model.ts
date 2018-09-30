export class Field {
  id: string;
  type: string;

  constructor(fields:Partial<Account>) {
    Object.assign(this, fields);
  }
}