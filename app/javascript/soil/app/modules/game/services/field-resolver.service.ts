import { Injectable } from '@angular/core';
import { Router, Resolve, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import { FieldService } from './field.service';
import { map } from 'rxjs/operators';

@Injectable()
export class FieldResolver implements Resolve<any> {

  constructor(private fieldService: FieldService, private router: Router) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.fieldService.getField(route.paramMap.get('id'))
        .pipe(map(response => {
          if (response) {
            return response;
          } else {
            console.log("Error while fetching data");
          }
        }));
  }
}