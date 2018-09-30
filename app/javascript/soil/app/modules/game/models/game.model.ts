export class Game {
  id: string;
  name: string;
  gameId: number;
  accessToken: string;
  expires: Date;

  constructor(fields:Partial<Account>) {
    Object.assign(this, fields);
  }
}