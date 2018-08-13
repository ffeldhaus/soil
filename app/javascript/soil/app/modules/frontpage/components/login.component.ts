import {Component} from '@angular/core';
import {Router} from '@angular/router';

import templateString from './login.component.html'

@Component({
  template: templateString,
})
export class LoginComponent {
  constructor(private router : Router) {
  }

  username : string;
  password : string;
  gameId: number;

  login() : void {
    if(this.username === 'test' && this.password === 'test'){
      this.router.navigate(["game"]);
    }else {
      alert("Invalid credentials");
    }
  }
}