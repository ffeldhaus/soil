import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-board-login-overlay',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './board-login-overlay.html',
})
export class BoardLoginOverlayComponent {
  @Input() authError: string | null = null;
  @Output() adminLogin = new EventEmitter<void>();
  @Output() playerLogin = new EventEmitter<{ gameId: string; playerNumber: string; pin: string }>();

  gameId = '';
  playerNumber = '';
  pin = '';

  t(key: string): string {
    const translations: Record<string, string> = {
      'board.login.phGameId': $localize`:Form Placeholder|Placeholder for game ID input@@board.login.phGameId:Game ID`,
      'board.login.phPlayerNum': $localize`:Form Placeholder|Placeholder for player number input@@board.login.phPlayerNum:Player Number`,
      'board.login.phPin': $localize`:Form Placeholder|Placeholder for PIN input@@board.login.phPin:PIN`,
    };
    return translations[key] || key;
  }

  onPlayerLogin() {
    this.playerLogin.emit({
      gameId: this.gameId,
      playerNumber: this.playerNumber,
      pin: this.pin,
    });
  }
}
