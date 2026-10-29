import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BackButtonComponent } from '../shared/back-button/back-button';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink, BackButtonComponent],
  template: `
    <div class="h-full overflow-y-auto custom-scrollbar relative font-sans text-gray-100">
      <!-- Background Image -->
      <div class="fixed inset-0 h-screen w-screen -z-10 pointer-events-none">
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

      <div class="relative z-10 max-w-5xl mx-auto pt-4 sm:pt-8 pb-12 px-4 sm:px-6 portrait:px-0 portrait:max-w-none space-y-8 animate-fade-in">
        <!-- Header -->
        <header class="bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 portrait:rounded-none portrait:border-x-0">
          <div>
            <h1 class="text-4xl sm:text-6xl font-bold text-emerald-500 mb-4 tracking-tight">Datenschutzerklärung</h1>
            <p class="text-xl text-white max-w-2xl">Informationen über die Verarbeitung deiner personenbezogenen Daten</p>
          </div>
          <app-back-button></app-back-button>
        </header>

        <!-- Allgemein -->
        <section class="bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">1. Verantwortliche Personen</h2>
          <p class="text-gray-300">
            Verantwortlich für die Datenverarbeitung auf dieser Webseite/App sind die im
            <a routerLink="/impressum" class="text-emerald-400 hover:underline">Impressum</a> genannten Personen.
          </p>
        </section>

        <!-- Datenerfassung -->
        <section class="bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">2. Datenerfassung und Anonymisierung</h2>
          
          <h3 class="text-xl font-bold text-gray-200 mt-4">Lokale Spiele (On-Device)</h3>
          <p class="text-gray-300">
            Wenn du "Lokale Spiele" spielst, werden deine Spieldaten ausschließlich lokal in deinem Browser (localStorage) gespeichert. 
            Es erfolgt keine Übertragung personenbezogener Daten an unsere Server, sofern du die optionale Übermittlung von anonymisierten 
            Spielergebnissen zu Forschungszwecken nicht explizit aktivierst.
          </p>

          <h3 class="text-xl font-bold text-gray-200 mt-4">Server-basierte Spiele (Cloud)</h3>
          <p class="text-gray-300">
            Für Multiplayer-Szenarien oder Cloud-Spiele ist eine Authentifizierung (Login) erforderlich. 
            Diese dient ausschließlich der technischen Bereitstellung der Spielfunktionen und der **Prävention von Missbrauch** 
            (z. B. Schutz vor automatisierten Angriffen oder unbefugter Erstellung von Inhalten).
          </p>
          <ul class="list-disc list-inside text-gray-300 space-y-2 ml-4">
            <li><strong>Registrierungsdaten:</strong> E-Mail-Adressen und Passwörter werden sicher über Firebase Authentication verarbeitet. Diese Daten werden ausschließlich zur Identifizierung deines Spielkontos und im Falle von Systemmissbrauch verwendet. Ein Abgleich mit anderen Datenquellen findet nicht statt.</li>
            <li><strong>Spieldaten:</strong> Deine Spielentscheidungen werden in unserer Datenbank gespeichert. Diese Daten sind für Spielzwecke mit deinem Konto verknüpft, um den Spielstand über mehrere Sitzungen hinweg zu erhalten.</li>
          </ul>

          <h3 class="text-xl font-bold text-gray-200 mt-4">Anonymisierung für Forschung & Statistik</h3>
          <p class="text-gray-300">
            Abgeschlossene Spiele werden standardmäßig in einer **vollständig anonymisierten Form** für statistische Auswertungen und Spielbalance-Analysen verwendet. 
            Dabei werden alle Bezüge zu deinem Benutzerkonto, Namen oder E-Mail-Adressen dauerhaft entfernt und Teams ausschließlich mit generischen Bezeichnungen (z. B. <code>Team 1</code>) gespeichert.
          </p>
          <p class="text-gray-300 mt-2">
            Dieser streng anonymisierte Datensatz ist für Bildung, Didaktik und wissenschaftliche Auswertungen öffentlich unter
            <a routerLink="/research" class="text-emerald-400 hover:underline">/research</a> sowie über eine schreibgeschützte Forschungs-API und MCP-Schnittstelle einsehbar.
            Du kannst die Übermittlung dieser anonymisierten Daten bei der Erstellung eines neuen Spiels jederzeit **deaktivieren**.
          </p>
        </section>

        <!-- Feedback -->
        <section class="bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">3. Feedback-Funktion</h2>
          <p class="text-gray-300">
            Wenn du uns Feedback über die integrierte Funktion sendest, erfolgt dies **vollständig anonym**. 
            Es werden keine personenbezogenen Daten wie Name, E-Mail-Adresse oder Benutzer-IDs mit dem Feedback übermittelt oder gespeichert.
          </p>
        </section>

        <!-- Dienstleister -->
        <section class="bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">4. Hosting und Infrastruktur (Firebase)</h2>
          <p class="text-gray-300">
            Diese App nutzt Google Firebase zur Bereitstellung von Datenbanken, Hosting und Authentifizierung. 
            Die Server befinden sich innerhalb der Europäischen Union (Region: europe-west4, Niederlande). 
            Google Firebase ist Teil der Google Cloud Platform und erfüllt hohe Sicherheitsstandards.
          </p>
        </section>

        <!-- Rechte -->
        <section class="bg-gray-900 p-4 sm:p-6 rounded-xl border border-gray-700 shadow-2xl space-y-4 portrait:rounded-none portrait:border-x-0">
          <h2 class="text-2xl font-bold text-white">5. Deine Betroffenenrechte</h2>
          <p class="text-gray-300">
            Du hast im Rahmen der geltenden gesetzlichen Bestimmungen (DSGVO) jederzeit das Recht auf unentgeltliche Auskunft über deine gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten.
          </p>
          <p class="text-gray-300">
            Du kannst dein Konto und alle damit verbundenen Daten jederzeit selbstständig über unsere 
            <a routerLink="/delete-account" class="text-emerald-400 hover:underline">Seite zur Kontolöschung</a> 
            löschen. Alternativ wende dich hierzu bitte an die im Impressum genannten Kontaktpersonen.
          </p>
        </section>
      </div>
    </div>
  `,
})
export class PrivacyPolicyComponent {}
