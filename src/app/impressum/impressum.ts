import { TranslocoPipe } from '@jsverse/transloco';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-impressum',
    standalone: true,
    imports: [TranslocoPipe, CommonModule, RouterLink],
    template: `
    <div class="min-h-screen bg-gray-900 text-gray-300 font-sans p-6 md:p-12">
      <div class="max-w-3xl mx-auto space-y-12 animate-fade-in">
        
        <!-- Header -->
        <header class="border-b border-gray-700 pb-8 flex justify-between items-center">
             <div>
                <h1 class="text-4xl font-serif font-bold text-emerald-500 mb-2" >{{ 'impressum.title' | transloco }}</h1>
                <p class="text-gray-400" >{{ 'impressum.subtitle' | transloco }}</p>
             </div>
             <a routerLink="/" class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition flex items-center gap-2" >{{ 'impressum.backToHome' | transloco }}</a>
        </header>

        <!-- Kontakt -->
        <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white" >{{ 'impressum.contact' | transloco }}</h2>
            <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <p class="font-bold text-white">Florian Feldhaus</p>
                <p>Kanonikerweg 2</p>
                <p>59494 Soest</p>
                <p>Email: <a href="mailto:florian.feldhaus&#64;gmail.com" class="text-emerald-400 hover:underline">florian.feldhaus&#64;gmail.com</a></p>
            </div>
        </section>

        <!-- Verantwortlich -->
        <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white" >{{ 'impressum.responsible' | transloco }}</h2>
            <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <p class="font-bold text-white">Nina Wolf</p>
                <p>Kanonikerweg 2</p>
                <p>59494 Soest</p>
                <p>Email: <a href="mailto:nina.vanessa.wolf&#64;gmail.com" class="text-emerald-400 hover:underline">nina.vanessa.wolf&#64;gmail.com</a></p>
            </div>
        </section>

        <!-- Bilder -->
        <section class="space-y-4">
            <h2 class="text-2xl font-bold text-white" >{{ 'impressum.imageSources' | transloco }}</h2>
            <ul class="space-y-2 list-disc list-inside text-gray-400 bg-gray-800/30 p-6 rounded-xl border border-gray-800">
                <li><a href="https://commons.wikimedia.org/wiki/File:Farmstead_in_winter,_Windsor_Township,_Berks_County,_Pennsylvania.jpg" class="hover:text-emerald-400 transition underline" >{{ 'impressum.source.farmstead' | transloco }}</a></li>
                <li><a href="https://commons.wikimedia.org/wiki/File:Drought.jpg" class="hover:text-emerald-400 transition underline" >{{ 'impressum.source.drought' | transloco }}</a></li>
                <li><a href="https://commons.wikimedia.org/wiki/File:Ostrinia.nubilalis.7771.jpg" class="hover:text-emerald-400 transition underline" >{{ 'impressum.source.borer' | transloco }}</a></li>
                <li><a href="https://commons.wikimedia.org/wiki/File:Marienk%C3%A4fer_0241.jpg" class="hover:text-emerald-400 transition underline" >{{ 'impressum.source.ladybug' | transloco }}</a></li>
                <li><a href="http://www.oekolandbau.de" class="hover:text-emerald-400 transition underline" >{{ 'impressum.source.oekolandbau' | transloco }}</a></li>
                <li><a href="https://commons.wikimedia.org/wiki/File:Organic-Logo.svg" class="hover:text-emerald-400 transition underline" >{{ 'impressum.source.logo' | transloco }}</a></li>
                <li><a href="https://www.landwirtschaftskammer.de" class="hover:text-emerald-400 transition underline" >{{ 'impressum.source.chamber' | transloco }}</a></li>
                <li><a href="https://www.bio-siegel.de/" class="hover:text-emerald-400 transition underline" >{{ 'impressum.source.bioSiegel' | transloco }}</a></li>
            </ul>
        </section>

        <!-- Disclaimer -->
        <section class="space-y-4">
             <h2 class="text-2xl font-bold text-white" >{{ 'impressum.disclaimer.title' | transloco }}</h2>
             <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700 text-sm leading-relaxed space-y-4">
                 <p >{{ 'impressum.disclaimer.p1' | transloco }}</p>
                 <p >{{ 'impressum.disclaimer.p2' | transloco }}</p>
                 <p >{{ 'impressum.disclaimer.p3' | transloco }}</p>
             </div>
        </section>
      </div>
    </div>
  `
})
export class ImpressumComponent { }
