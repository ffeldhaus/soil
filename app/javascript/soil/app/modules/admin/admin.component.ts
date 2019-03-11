import {
  Component,
  OnInit
} from '@angular/core';

import {Router} from "@angular/router";

import {FormControl, FormGroupDirective, NgForm, Validators, FormGroup, FormBuilder} from '@angular/forms';
import {ErrorStateMatcher} from '@angular/material/core';

import templateString from './admin.component.html';
import './admin.component.css';

import '../../assets/files/sortenpass.pdf';

import {User} from '../shared/models/user.model';

import {AngularTokenService} from 'angular-token';

import {GameService} from "../shared/services/game.service";
import {Game} from "../shared/models/game.model";
import {Player} from "../shared/models/player.model";

@Component({
  template: templateString,
})
export class AdminComponent implements OnInit {

  createForm: FormGroup;

  constructor(
      private tokenService: AngularTokenService,
      private gameService: GameService,
      private router: Router,
      private formBuilder: FormBuilder,
  ) {
    this.createForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(128)]],
      numberOfPlayers: [4, [Validators.required, Validators.min(1), Validators.max(8)]]
    });
  }

  currentUser: User;
  games: Game[];

  ngOnInit() {
    this.currentUser = new User(JSON.parse(localStorage.getItem('currentUser')));
    this.gameService.getGames().subscribe(
        response => {
          this.games = response.data.map(data => {
            let game = new Game(data.attributes);
            game.players = data.relationships.players.data.map(playerRelationship => {
              let player = response.included.find(included => included.type === "player" && included.id === playerRelationship.id);
              return new Player(player.attributes);
            });
            return game;
          });
        }
    );
  }

  createGame() {
    this.gameService.newGame({name: this.createForm.controls.name.value, numberOfPlayers: this.createForm.controls.numberOfPlayers.value}).subscribe(
        response => {
          alert("Spiel erfolgreich erstellt");
          let game = new Game(response.data.attributes);
          game.players = response.data.relationships.players.data.map(playerRelationship => {
                let player = response.included.find(included => included.type === "player" && included.id === playerRelationship.id);
                return new Player(player.attributes);
              });
          this.games.push(game);
        },
        error => {
          alert("Spiel Erstellung fehlgeschlagen");
        }
    )
  }

  deleteGame(gameId) {
    this.gameService.deleteGame(gameId).subscribe(
        response => {
          alert("Spiel erfolgreich gelöscht");
          this.games = this.games.filter(game => game.id !== gameId);
        },
        error => {
          alert("Löschen des Spiels fehlgeschlagen");
        }
    )
  }

  logout(): void {
    this.tokenService.signOut().subscribe(
        res => console.log('Successfully logged out'),
        error => console.log('Log out failed')
    );
    this.router.navigate(['/frontpage/login']);
  }
}