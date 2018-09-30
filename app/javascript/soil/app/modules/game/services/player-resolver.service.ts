import { Injectable } from '@angular/core';
import { Router, Resolve, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import { PlayerService } from './player.service';
import { map } from 'rxjs/operators';

@Injectable()
export class PlayerResolver implements Resolve<any> {

  constructor(private playerService: PlayerService, private router: Router) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.playerService.getPlayer(route.paramMap.get('id'))
        .pipe(map(response => {
          if (response) {
            return response;
          } else {
            console.log("Error while fetching data");
          }
        }));
  }
}