import { Injectable } from '@angular/core';
import { Router, Resolve, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import { RoundService } from './round.service';
import { map } from 'rxjs/operators';

@Injectable()
export class RoundResolver implements Resolve<any> {

  constructor(private roundService: RoundService, private router: Router) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.roundService.getRound(route.paramMap.get('id'))
        .pipe(map(response => {
          if (response.data) {
            return response.data;
          } else {
            console.log("Error while fetching data");
          }
        }));
  }
}