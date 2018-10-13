export class Response {
  status: string;
  deprecated: string;
  data: any;

  constructor(fields:Partial<Response>) {
    Object.assign(this, fields);
  }
}