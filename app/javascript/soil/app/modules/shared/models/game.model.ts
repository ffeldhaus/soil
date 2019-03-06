import {Player} from "./player.model";

export class Game {
  id: string;
  name: string;
  currentRound: number;
  gameId: number;
  accessToken: string;
  numberOfRounds: number;
  numberOfPlayers: number;
  expires: Date;
  players: Player[];

  constructor(fields:Partial<Game>) {
    Object.assign(this, fields);
  }
}