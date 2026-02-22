import { Component, inject, type OnInit } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="h-full overflow-y-auto custom-scrollbar relative font-sans text-gray-100">
      <!-- Background Image -->
      <div class="fixed inset-0 h-screen w-screen z-0 pointer-events-none">
        <picture>
          <source srcset="assets/images/bauernhof-portrait-dunkel.webp" media="(orientation: portrait)" />
          <img
            src="assets/images/bauernhof-landscape-dunkel.webp"
            alt=""
            fetchpriority="high"
            class="w-full h-full object-cover portrait:object-center landscape:object-center"
          />
        </picture>
      </div>

      <!-- Navigation Bar -->
      <nav
        class="bg-gray-900/95 border-b border-gray-700 backdrop-blur shadow-lg px-6 py-1 fixed top-0 left-0 right-0 z-50 flex items-center justify-between shrink-0 h-10 print:hidden"
      >
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-bold font-sans text-emerald-500 tracking-wider">SOIL</h1>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/"
            class="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition w-10 h-10 flex items-center justify-center"
            title="Zur Startseite"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </a>
        </div>
      </nav>

      <div class="relative z-10 max-w-5xl mx-auto pt-[72px] pb-12 px-4 sm:px-6 portrait:px-0 portrait:max-w-none space-y-8 animate-fade-in">
        <!-- Header -->
        <header class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl portrait:rounded-none portrait:border-x-0">
          <h1 class="text-4xl font-serif font-bold text-emerald-500 mb-2">Datenschutzerklärung</h1>
          <p class="text-gray-400">Informationen über die Verarbeitung Ihrer personenbezogenen Daten</p>
        </header>

        <!-- Allgemein -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">1. Verantwortliche Personen</h2>
          <p class="text-gray-300">
            Verantwortlich für die Datenverarbeitung auf dieser Webseite/App sind die im
            <a routerLink="/impressum" class="text-emerald-400 hover:underline">Impressum</a> genannten Personen.
          </p>
        </section>

        <!-- Datenerfassung -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">2. Datenerfassung und Anonymisierung</h2>
          
          <h3 class="text-xl font-bold text-gray-200 mt-4">Lokale Spiele (On-Device)</h3>
          <p class="text-gray-300">
            Wenn Sie "Lokale Spiele" spielen, werden Ihre Spieldaten ausschließlich lokal in Ihrem Browser (localStorage) gespeichert. 
            Es erfolgt keine Übertragung personenbezogener Daten an unsere Server, sofern Sie die optionale Übermittlung von anonymisierten 
            Spielergebnissen zu Forschungszwecken nicht explizit aktivieren.
          </p>

          <h3 class="text-xl font-bold text-gray-200 mt-4">Server-basierte Spiele (Cloud)</h3>
          <p class="text-gray-300">
            Für Multiplayer-Szenarien oder Cloud-Spiele ist eine Authentifizierung (Login) erforderlich. 
            Diese dient ausschließlich der technischen Bereitstellung der Spielfunktionen und der **Prävention von Missbrauch** 
            (z. B. Schutz vor automatisierten Angriffen oder unbefugter Erstellung von Inhalten).
          </p>
          <ul class="list-disc list-inside text-gray-300 space-y-2 ml-4">
            <li><strong>Registrierungsdaten:</strong> E-Mail-Adressen und Passwörter werden sicher über Firebase Authentication verarbeitet. Diese Daten werden ausschließlich zur Identifizierung Ihres Spielkontos und im Falle von Systemmissbrauch verwendet. Ein Abgleich mit anderen Datenquellen findet nicht statt.</li>
            <li><strong>Spieldaten:</strong> Ihre Spielentscheidungen werden in unserer Datenbank gespeichert. Diese Daten sind für Spielzwecke mit Ihrem Konto verknüpft, um den Spielstand über mehrere Sitzungen hinweg zu erhalten.</li>
          </ul>

          <h3 class="text-xl font-bold text-gray-200 mt-4">Anonymisierung für Forschung & Statistik</h3>
          <p class="text-gray-300">
            Abgeschlossene Spiele werden standardmäßig in einer **vollständig anonymisierten Form** für statistische Auswertungen und Spielbalance-Analysen verwendet. 
            Dabei werden alle Bezüge zu Ihrem Benutzerkonto dauerhaft entfernt.
          </p>
          <p class="text-gray-300 mt-2">
            Diese Funktion hilft uns, das Spiel kontinuierlich zu verbessern. Sie können die Übermittlung dieser anonymisierten Daten bei der Erstellung eines neuen Spiels jederzeit **deaktivieren**.
          </p>
        </section>

        <!-- Feedback -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">3. Feedback-Funktion</h2>
          <p class="text-gray-300">
            Wenn Sie uns Feedback über die integrierte Funktion senden, erfolgt dies **vollständig anonym**. 
            Es werden keine personenbezogenen Daten wie Name, E-Mail-Adresse oder Benutzer-IDs mit dem Feedback übermittelt oder gespeichert.
          </p>
        </section>

        <!-- Dienstleister -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">4. Hosting und Infrastruktur (Firebase)</h2>
          <p class="text-gray-300">
            Diese App nutzt Google Firebase zur Bereitstellung von Datenbanken, Hosting und Authentifizierung. 
            Die Server befinden sich innerhalb der Europäischen Union (Region: europe-west4, Niederlande). 
            Google Firebase ist Teil der Google Cloud Platform und erfüllt hohe Sicherheitsstandards.
          </p>
        </section>

        <!-- Rechte -->
        <section class="bg-gray-900/80 backdrop-blur-md p-8 sm:p-12 rounded-3xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">5. Ihre Betroffenenrechte</h2>
          <p class="text-gray-300">
            Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen (DSGVO) jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten.
          </p>
          <p class="text-gray-300">
            Wenden Sie sich hierzu bitte an die im Impressum genannten Kontaktpersonen.
          </p>
        </section>
      </div>
    </div>
  `,
})
export class PrivacyPolicyComponent implements OnInit {
  private meta = inject(Meta);

  ngOnInit() {
    this.meta.addTag({ name: 'robots', content: 'noindex' });
  }
}
