const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../src/locale/messages.xlf');
const destPath = path.join(__dirname, '../src/locale/messages.de.xlf');

const translations = {
    // App
    'app.impressum': 'Impressum',
    'app.footer.text': 'Soil - Ein Spiel über Boden',

    // Impressum
    'impressum.title': 'Impressum',
    'impressum.subtitle': 'Impressum & Credits',
    'impressum.backToHome': 'Zurück zur Startseite', // has SVG inside, need specific handling or just replace text if possible. Ah, it has placeholders. I will handle simple text replacement.
    'impressum.contact': 'Kontakt',
    'impressum.responsible': 'Verantwortlich für den Inhalt',
    'impressum.imageSources': 'Bildnachweise',
    'impressum.source.farmstead': 'Hintergrundbild Farmstead, Windsor Township, Berks County',
    'impressum.source.drought': 'Dürre',
    'impressum.source.borer': 'Maiszünsler',
    'impressum.source.ladybug': 'Marienkäfer',
    'impressum.source.oekolandbau': 'Ökolandbau.de',
    'impressum.source.logo': 'Logo "Euro-Blatt"',
    'impressum.source.chamber': 'Landwirtschaftskammer Nordrhein-Westfalen',
    'impressum.source.bioSiegel': 'Bio-Siegel',
    'impressum.disclaimer.title': 'Haftungsausschluss (Disclaimer)',
    'impressum.disclaimer.p1': 'Für die Richtigkeit und Vollständigkeit der Inhalte dieser Website wird keine Gewähr übernommen. Die Inhalte dieser Seite unterliegen dem deutschen Urheberrecht. Jede Vervielfältigung oder Verbreitung bedarf der schriftlichen Zustimmung. Downloads und Kopien sind nur für den nicht-kommerziellen Gebrauch gestattet.',
    'impressum.disclaimer.p2': 'Für die Inhalte externer Links wird keine Haftung übernommen. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.',
    'impressum.disclaimer.p3': 'Die Nutzung der Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Personenbezogene Daten, die für die Registrierung als Spielleitung erforderlich sind, sowie Spieldaten werden nicht an Dritte weitergegeben.',

    // Board
    'board.login.adminTitle': 'Admin-Zugang',
    'board.login.adminDesc': 'Spiele verwalten und die Simulation steuern.',
    'board.login.btnGoogle': 'Anmelden mit Google',
    'board.login.playerTitle': 'Spieler-Zugang',
    'board.login.playerDesc': 'Spiel-ID und Zugangsdaten eingeben.',
    'board.login.phGameId': 'Spiel-ID',
    'board.login.phPlayerNum': 'Spieler # (z.B. 1)',
    'board.login.phPin': 'Spiel-Passwort',
    'board.login.btnLogin': 'Anmelden',
    'board.hud.round': 'Runde',
    'board.hud.capital': 'Kapital',
    'board.banner.readOnly': 'SCHREIBGESCHÜTZTER MODUS',
    'board.settings.title': 'Einstellungen',
    'board.settings.lang': 'Sprache',
    'board.settings.playerName': 'Spielername',
    'board.settings.phPlayerName': 'Name eingeben',
    'board.settings.cancel': 'Abbrechen',
    'board.settings.save': 'Speichern',
    'board.error.title': 'Fehler',
    'board.error.close': 'Schließen',
    'board.nextRound': 'Nächste Runde >',
    'board.yourField': '< Dein Feld >',

    // Crops
    'crop.wheat': 'Weizen',
    'crop.corn': 'Mais',
    'crop.potato': 'Kartoffel',
    'crop.beet': 'Zuckerrübe',
    'crop.barley': 'Gerste',
    'crop.oat': 'Hafer',
    'crop.rye': 'Roggen',
    'crop.fieldbean': 'Ackerbohne',
    'crop.animals': 'Tiere',
    'crop.fallow': 'Brachland',

    // Planting
    'planting.title': 'Fruchtart wählen',
    'planting.cancel': 'Abbrechen',

    // Dashboard
    'dashboard.pending.title': 'Konto wartet auf Genehmigung',
    'dashboard.logout': 'Abmelden',
    'dashboard.loading.verifying': 'Konto-Status wird geprüft...',
    'dashboard.controls.title': 'Admin-Steuerung',
    'dashboard.createGame.title': 'Neues Spiel erstellen',
    'dashboard.createGame.name': 'Spielname',
    'dashboard.createGame.players': 'Spieler (1-8)',
    'dashboard.createGame.rounds': 'Runden',
    'dashboard.createGame.bots': 'KI-Bots',
    'dashboard.createGame.submit': '+ Neues Spiel erstellen',
    'dashboard.createGame.creating': 'Wird erstellt...',
    'dashboard.created.title': 'Spiel erstellt!',
    'dashboard.created.id': 'Spiel-ID',
    'dashboard.list.trash': 'Papierkorb (Gelöschte Spiele)',
    'dashboard.list.active': 'Aktive Spiele',
    'dashboard.filter.active': 'Aktiv',
    'dashboard.filter.trash': 'Papierkorb',
    'dashboard.actions.restoreSelected': 'Ausgewählte wiederherstellen',
    'dashboard.actions.deleteSelected': 'Ausgewählte löschen',
    'dashboard.error.retry': 'Erneut versuchen',
    'dashboard.loading.games': 'Spiele werden geladen...',
    'dashboard.table.name': 'Name',
    'dashboard.table.details': 'Details',
    'dashboard.table.round': 'Runde',
    'dashboard.table.deletedAt': 'Gelöscht am',
    'dashboard.table.created': 'Erstellt',
    'dashboard.table.actions': 'Aktionen',
    'dashboard.details.noPlayers': 'Noch keine Spieler beigetreten.',
    'dashboard.player.label': 'Spieler',
    'dashboard.player.capital': 'Kapital',
    'dashboard.player.round': 'Runde',
    'dashboard.player.submitted': 'Abgegeben?',
    'dashboard.empty.title': 'Keine Spiele gefunden.',
    'dashboard.empty.subtitle': 'Erstelle ein neues Spiel, um zu beginnen!',
    'dashboard.pagination.showing': 'Zeige',
    'dashboard.pagination.of': 'von',
    'dashboard.pagination.prev': 'Zurück',
    'dashboard.pagination.page': 'Seite',
    'dashboard.pagination.next': 'Weiter',
    'dashboard.qr.access': 'Zugang',
    'dashboard.qr.scan': 'Scannen zum automatischen Anmelden.',
    'dashboard.qr.print': 'Drucken',
    'dashboard.qr.close': 'Schließen',
    'dashboard.delete.permanent': 'Dauerhaftes Löschen',
    'dashboard.delete.confirm': 'Löschen bestätigen',
    'dashboard.delete.games': 'Spiel(e)',
    'dashboard.delete.soft.title': 'Papierkorb:',
    'dashboard.delete.soft.desc': 'Spiele werden in den Papierkorb verschoben. Du kannst sie jederzeit wiederherstellen innerhalb von',
    'dashboard.delete.days': 'Tagen',
    'dashboard.delete.warning': 'WARNUNG:',
    'dashboard.delete.permanentDesc': 'Diese Aktion kann nicht rückgängig gemacht werden. Alle Spieldaten werden sofort zerstört.',
    'dashboard.delete.cancel': 'Abbrechen',
    'dashboard.delete.btnPermanent': 'Dauerhaft löschen',
    'dashboard.delete.btnGame': 'Spiel löschen',
    'dashboard.error.title': 'Fehler',
    'dashboard.error.close': 'Schließen',
    'dashboard.login.msg': 'Bitte melde dich an, um auf das Admin-Dashboard zuzugreifen.',
    'dashboard.login.btn': 'Anmelden mit Google',
};

// Complex translations with placeholders replacement logic
// We assume placeholders like <x id="..."/> are identical in source and target.
// We map IDs to target STRINGS with placeholders INTERPOLATED or we just replace the text parts surrounding them if easy.
// Or we just output the <target> same as source but with text replaced.

// For simplicity, I'll read the file, and using Regex, replace:
// <trans-unit id="XYZ"> ... <source>TEXT</source> ... </trans-unit>
// with
// <trans-unit id="XYZ"> ... <source>TEXT</source> <target>TRANSLATED_TEXT</target> ... </trans-unit>

const content = fs.readFileSync(srcPath, 'utf8');

let newContent = content.replace(/<trans-unit id="([^"]+)" datatype="html">([\s\S]*?)<\/trans-unit>/g, (match, id, body) => {
    // Extract source
    const sourceMatch = body.match(/<source>([\s\S]*?)<\/source>/);
    if (!sourceMatch) return match;

    const source = sourceMatch[1];
    let target = '';

    if (translations[id]) {
        // Simple translation available?
        // Check if source has placeholders
        if (source.includes('<x id=')) {
            // It has placeholders. 
            // Strategy: Replace text content outside labels.
            // For 'dashboard.welcome', source is `Welcome, <x.../> <x.../>!`
            // We want `Willkommen, <x.../> <x.../>!`

            if (id === 'dashboard.welcome') {
                target = source.replace('Welcome, ', 'Willkommen, ');
            } else if (id === 'dashboard.pending.welcome') {
                target = source.replace('Thank you for registering, ', 'Danke für die Registrierung, ');
            } else if (id === 'impressum.backToHome') {
                target = source.replace(' Back to Home ', ' Zurück zur Startseite ');
            } else if (id === 'dashboard.delete.typeConfirm') {
                target = source.replace('Type ', 'Tippe ').replace(' to confirm:', ' zur Bestätigung:');
            } else if (id === 'dashboard.delete.questionPermanent' || id === 'dashboard.delete.questionBatchPermanent') {
                target = source.replace('Are you sure you want to permanently delete', 'Möchtest du wirklich dauerhaft löschen');
            } else if (id === 'dashboard.delete.question' || id === 'dashboard.delete.questionBatch') {
                target = source.replace('Are you sure you want to delete', 'Möchtest du wirklich löschen');
            } else {
                // Fallback: Copy source if we don't know how to handle placeholders for this specific ID
                target = source;
            }
        } else {
            target = translations[id];
        }
    } else {
        // No translation found, check fallback or keep English with TODO prefix?
        // Or just copy source (default behavior)
        target = source;
    }

    // Insert target after source
    return match.replace(/<\/source>/, `</source>\n        <target>${target}</target>`);
});

// Update language attribute
newContent = newContent.replace('target-language="de"', ''); // remove if exists
newContent = newContent.replace('<file source-language="en-US" datatype="plaintext" original="ng2.template">', '<file source-language="en-US" datatype="plaintext" original="ng2.template" target-language="de">');

fs.writeFileSync(destPath, newContent);
console.log('German translation file created at ' + destPath);
