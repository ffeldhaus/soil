export class Player {
  id: string;
  name: string;
  gameId: number;

  constructor(fields:Partial<Account>) {
    Object.assign(this, fields);
  }
}