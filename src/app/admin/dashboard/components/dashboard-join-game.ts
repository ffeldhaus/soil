import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard-join-game',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bg-gray-900 p-8 rounded-3xl border border-gray-700 shadow-2xl space-y-6 portrait:rounded-none portrait:border-x-0">
      <h2 class="text-2xl font-bold text-emerald-400" i18n="@@dashboard.joinGame.title">Einem Spiel beitreten</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs text-gray-200 mb-1" i18n="@@dashboard.joinGame.id">Spiel-ID</label>
          <input
            [(ngModel)]="joinConfig.gameId"
            placeholder="z.B. abc-123"
            class="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label class="block text-xs text-gray-200 mb-1" i18n="@@dashboard.joinGame.pin">PIN (optional)</label>
          <input
            [(ngModel)]="joinConfig.pin"
            type="password"
            placeholder="••••"
            class="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <button
        (click)="onJoin()"
        [disabled]="!joinConfig.gameId"
        class="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition shadow-lg flex items-center justify-center gap-2"
      >
        <span i18n="@@dashboard.joinGame.submit">Spiel beitreten</span>
      </button>
    </div>
  `,
})
export class DashboardJoinGameComponent {
  @Output() joinGame = new EventEmitter<{ gameId: string; pin: string }>();

  joinConfig = {
    gameId: '',
    pin: '',
  };

  onJoin() {
    if (this.joinConfig.gameId) {
      this.joinGame.emit(this.joinConfig);
    }
  }
}
