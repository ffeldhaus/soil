export class Response {
  status: string;
  deprecated: string;
  data: any;
  included: any;

  constructor(fields:Partial<Response>) {
    Object.assign(this, fields);
  }
}