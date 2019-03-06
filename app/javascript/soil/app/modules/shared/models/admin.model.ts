export class Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;

  constructor(fields:Partial<Account>) {
    Object.assign(this, fields);
  }
}