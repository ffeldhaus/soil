export class Parcel {
  id: string;
  type: string;
  plantation: string;

  constructor(fields: Partial<Account>) {
    Object.assign(this, fields);
  }
}