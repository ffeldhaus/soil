import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard-join-game',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6">
      <h2 class="text-2xl font-bold text-emerald-400">Einem Spiel beitreten</h2>
      
      <form (ngSubmit)="onJoin()" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-gray-200 mb-1">Spiel-ID</label>
            <input
              name="gameId"
              [(ngModel)]="joinConfig.gameId"
              placeholder="z.B. abc-123"
              class="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label class="block text-xs text-gray-200 mb-1">PIN (optional)</label>
            <input
              name="pin"
              [(ngModel)]="joinConfig.pin"
              type="password"
              placeholder="••••"
              class="w-full px-4 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          type="submit"
          [disabled]="!joinConfig.gameId"
          class="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition shadow-lg flex items-center justify-center gap-2"
        >
          <span>Spiel beitreten</span>
        </button>
      </form>
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
