import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import { ResultService } from './result.service';
import { map } from 'rxjs/operators';

@Injectable()
export class ResultResolver implements Resolve<any> {

  constructor(private resultService: ResultService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.resultService.getResults()
        .pipe(map(response => {
          if (response) {
            return response;
          } else {
            console.log("Error while fetching data");
          }
        }));
  }
}