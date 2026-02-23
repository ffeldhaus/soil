import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4 relative overflow-hidden font-sans">
      <!-- Background Asset (consistent with app theme) -->
      <div class="fixed inset-0 h-screen w-screen -z-10 pointer-events-none opacity-30">
        <picture>
          <source srcset="assets/images/bauernhof-portrait-dunkel.webp" media="(orientation: portrait)" />
          <img
            src="assets/images/bauernhof-landscape-dunkel.webp"
            alt=""
            class="w-full h-full object-cover"
          />
        </picture>
      </div>

      <div class="relative z-10 text-center space-y-4 max-w-lg animate-fade-in">
        <div class="space-y-2">
          <h1 class="text-9xl font-black text-emerald-500/20 select-none tracking-tighter">
            404
          </h1>
          <h2 class="text-4xl sm:text-5xl font-bold text-white relative">
            Seite nicht gefunden
          </h2>
          <p class="text-gray-400 text-lg sm:text-xl leading-relaxed">
            Es sieht so aus, als hätten wir den Pfad zu diesem Acker verloren.
          </p>
        </div>

        <div class="pt-8">
          <a
            routerLink="/"
            class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-xl active:scale-95 group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Zurück zum Hof
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `,
  ],
})
export class NotFoundComponent {}
