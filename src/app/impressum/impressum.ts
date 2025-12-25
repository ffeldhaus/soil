import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-impressum',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="min-h-screen bg-gray-900 text-gray-300 font-sans p-6 md:p-12">
      <div class="max-w-3xl mx-auto space-y-12 animate-fade-in">
        
        <!-- Header -->
        <header class="border-b border-gray-700 pb-8 flex justify-between items-center">
             <div>
                <h1 class="text-4xl font-serif font-bold text-emerald-500 mb-2" i18n="@@impressum.title">Legal Notice</h1>
                <p class="text-gray-400" i18n="@@impressum.subtitle">Legal Notice & Credits</p>
             </div>
             <a routerLink="/" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition flex items-center gap-2" i18n="@@impressum.backToHome">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                Back to Home
             </a>
        </header>

        <!-- Kontakt -->
        <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white" i18n="@@impressum.contact">Contact</h2>
            <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <p class="font-bold text-white">Florian Feldhaus</p>
                <p>Kanonikerweg 2</p>
                <p>59494 Soest</p>
                <p>Email: <a href="mailto:florian.feldhaus&#64;gmail.com" class="text-emerald-400 hover:underline">florian.feldhaus&#64;gmail.com</a></p>
            </div>
        </section>

        <!-- Verantwortlich -->
        <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white" i18n="@@impressum.responsible">Responsible for Content</h2>
            <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <p class="font-bold text-white">Nina Wolf</p>
                <p>Kanonikerweg 2</p>
                <p>59494 Soest</p>
                <p>Email: <a href="mailto:nina.vanessa.wolf&#64;gmail.com" class="text-emerald-400 hover:underline">nina.vanessa.wolf&#64;gmail.com</a></p>
            </div>
        </section>

        <!-- Bilder -->
        <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white" i18n="@@impressum.imageSources">Image Sources</h2>
            <ul class="space-y-2 list-disc list-inside text-gray-400 bg-gray-800/30 p-6 rounded-xl border border-gray-800">
                <li><a href="https://commons.wikimedia.org/wiki/File:Farmstead_in_winter,_Windsor_Township,_Berks_County,_Pennsylvania.jpg" class="hover:text-emerald-400 transition underline" i18n="@@impressum.source.farmstead">Background image Farmstead, Windsor Township, Berks County</a></li>
                <li><a href="https://commons.wikimedia.org/wiki/File:Drought.jpg" class="hover:text-emerald-400 transition underline" i18n="@@impressum.source.drought">Drought</a></li>
                <li><a href="https://commons.wikimedia.org/wiki/File:Ostrinia.nubilalis.7771.jpg" class="hover:text-emerald-400 transition underline" i18n="@@impressum.source.borer">European Corn Borer</a></li>
                <li><a href="https://commons.wikimedia.org/wiki/File:Marienk%C3%A4fer_0241.jpg" class="hover:text-emerald-400 transition underline" i18n="@@impressum.source.ladybug">Ladybug</a></li>
                <li><a href="http://www.oekolandbau.de" class="hover:text-emerald-400 transition underline" i18n="@@impressum.source.oekolandbau">Ökolandbau - The Information Portal</a></li>
                <li><a href="https://commons.wikimedia.org/wiki/File:Organic-Logo.svg" class="hover:text-emerald-400 transition underline" i18n="@@impressum.source.logo">Logo "Euro-Leaf"</a></li>
                <li><a href="https://www.landwirtschaftskammer.de" class="hover:text-emerald-400 transition underline" i18n="@@impressum.source.chamber">Chamber of Agriculture North Rhine-Westphalia</a></li>
                <li><a href="https://www.bio-siegel.de/" class="hover:text-emerald-400 transition underline" i18n="@@impressum.source.bioSiegel">Bio-Siegel</a></li>
            </ul>
        </section>

        <!-- Disclaimer -->
        <section class="space-y-4">
             <h2 class="text-2xl font-bold text-white" i18n="@@impressum.disclaimer.title">Disclaimer</h2>
             <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700 text-sm leading-relaxed space-y-4">
                 <p i18n="@@impressum.disclaimer.p1">
                  No guarantee is assumed for the correctness and completeness of the contents of this website.
                  The contents of this page are subject to German copyright law. Any duplication or distribution requires
                  written consent. Downloads and copies are permitted only for non-commercial use.
                 </p>
                 <p i18n="@@impressum.disclaimer.p2">
                  No responsibility is assumed for content of external sites linked to. For
                  external sites, the respective providers are exclusively responsible.
                 </p>
                 <p i18n="@@impressum.disclaimer.p3">
                  The use of the website is generally possible without providing personal data. Personal data required for
                  registration as game management, as well as game data, will not be passed on to third parties.
                 </p>
             </div>
        </section>
      </div>
    </div>
  `
})
export class ImpressumComponent { }
