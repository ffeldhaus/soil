import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import { GameService } from './game.service';
import { map } from 'rxjs/operators';

@Injectable()
export class GameResolver implements Resolve<any> {

  constructor(private gameService: GameService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.gameService.getGame(route.paramMap.get('id'))
        .pipe(map(response => {
          if (response.data) {
            return response.data;
          } else {
            console.log("Error while fetching data");
          }
        }));
  }
}