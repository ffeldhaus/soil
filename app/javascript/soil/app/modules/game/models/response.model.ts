export class Response {
  responseTime: string;
  status: string;
  apiVersion: string;
  deprecated: string;
  data: any;

  constructor(fields:Partial<Response>) {
    Object.assign(this, fields);
  }
}