export class User {
  id: string;
  name: string;
  role: string;
  gameId: number;
  token: string;
  expiration: Date;

  constructor(fields:Partial<Account>) {
    Object.assign(this, fields);
  }
}