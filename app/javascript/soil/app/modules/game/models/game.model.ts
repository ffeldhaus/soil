export class Game {
  id: string;
  name: string;
  currentRound: number;
  gameId: number;
  accessToken: string;
  expires: Date;

  constructor(fields:Partial<Account>) {
    Object.assign(this, fields);
  }
}