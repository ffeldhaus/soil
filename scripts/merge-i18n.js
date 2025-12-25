const fs = require('fs');

const messagesEn = fs.readFileSync('src/locale/messages.xlf', 'utf8');
const messagesDe = fs.readFileSync('src/locale/messages.de.xlf', 'utf8');

const extractUnits = (content) => {
    const units = {};
    const regex = /<trans-unit id="([^"]+)"[^>]*>([\s\S]*?)<\/trans-unit>/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        units[match[1]] = match[0];
    }
    return units;
};

const unitsEn = extractUnits(messagesEn);
const idsDe = new Set(Object.keys(extractUnits(messagesDe)));

const missingIds = Object.keys(unitsEn).filter(id => !idsDe.has(id));

const translations = {
    'ai.level.elementary': 'Grundschule',
    'ai.level.middle': 'Mittelstufe',
    'ai.level.high': 'Oberstufe',
    'board.gameEnd.backToDashboard': 'ZURÜCK ZUM DASHBOARD',
    'board.gameEnd.financialTitle': 'Finanz-Champion',
    'board.gameEnd.soilTitle': 'Boden-Wächter',
    'board.gameEnd.subtitle': 'Herzlichen Glückwunsch an unsere Pioniere!',
    'board.gameEnd.title': 'Spiel beendet!',
    'board.gameEnd.viewResults': 'ERGEBNISSE ANSEHEN',
    'board.logout': 'Abmelden',
    'board.mobile.endGame': 'SPIEL BEENDEN',
    'board.mobile.finance': 'Finanzansicht',
    'board.nav.endGame': 'SPIEL BEENDEN',
    'board.nav.finance': 'FINANZEN',
    'board.round': 'Runde',
    'dashboard.createGame.aiLevel': 'KI-Level',
    'dashboard.createGame.phName': 'Name des Spiels eingeben',
    'dashboard.deadline.hint': '* Wenn eine Deadline gesetzt ist, übernimmt die KI automatisch für alle Spieler, die bis dahin nicht abgegeben haben.',
    'dashboard.deadline.round': 'Aktuelle Runde (<x id="INTERPOLATION" equiv-text="{{ game.currentRoundNumber }}"/>)',
    'dashboard.deadline.set': 'Deadline setzen',
    'dashboard.deadline.title': 'Runden-Deadline-Manager',
    'dashboard.player.nutrition': 'Nährstoffe',
    'dashboard.player.soil': 'Boden',
    'dashboard.player.toAi': 'ZU KI (<x id="INTERPOLATION" equiv-text="{{ newGameConfig.aiLevel | uppercase }}"/>)',
    'dashboard.player.toHuman': 'ZU MENSCH',
    'finance.charts.capital': 'Kapitalverlauf',
    'finance.event.vermin': 'Schädlingsbericht',
    'finance.event.weather': 'Regionales Wetter',
    'finance.fertilizer': 'Dünger',
    'finance.group.decisions': 'Deine Entscheidungen',
    'finance.group.expenses': 'Ausgabendetails',
    'finance.group.income': 'Einnahmendeteils',
    'finance.header.harvest': 'Gesamte Ernteeinnahmen',
    'finance.header.investments': 'Investitionen',
    'finance.header.running': 'Laufende Kosten',
    'finance.header.seeds': 'Saatgutkosten',
    'finance.noRounds': 'Keine Rundenhistorie verfügbar.',
    'finance.organic': 'Bio',
    'finance.organisms': 'Nützlinge',
    'finance.pesticide': 'Pestizide',
    'finance.playerStatus': 'Farmer-Status',
    'finance.result.capital': 'ENDKAPITAL',
    'finance.result.profit': 'NETTOGEWINN / VERLUST',
    'finance.sub.animalsInvest': 'Tiere (Kauf)',
    'finance.sub.animalsRunning': 'Tiere (Anbau/Haltung)',
    'finance.sub.base': 'Grundkosten',
    'finance.sub.machines': 'Maschinen',
    'finance.sub.organicControl': 'Bio-Kontrolle',
    'finance.sub.organisms': 'Nützlinge',
    'finance.sub.pesticide': 'Pestizideinsatz',
    'finance.subtitle': 'Wirtschaftliche Leistung über alle Runden',
    'finance.title': 'Finanzbericht',
    'finance.you': '(Du)',
    'roundResult.bioSiegel': 'Bio-Siegel',
    'roundResult.bioSiegelFail': 'Anforderungen nicht erfüllt',
    'roundResult.bioSiegelSuccess': ' verliehen!',
    'roundResult.conditions': 'Bedingungen',
    'roundResult.continue': ' Weiter zu Runde <x id="INTERPOLATION" equiv-text="{{ round.number + 1 }}"/> ',
    'roundResult.profit': 'Gewinn',
    'roundResult.title': 'Rundenbericht ',
    'roundResult.vermin': 'Schädlinge',
    'roundResult.weather': 'Wetter'
};

let newUnits = '';
for (const id of missingIds) {
    if (id === 'INTERPOLATION') continue;
    let unit = unitsEn[id];
    const target = translations[id] || '';
    if (target) {
        unit = unit.replace('</source>', `</source>\n        <target>${target}</target>`);
    } else {
        unit = unit.replace('</source>', `</source>\n        <target>${id}</target>`);
    }
    newUnits += '      ' + unit + '\n';
}

const updatedDe = messagesDe.replace('</body>', newUnits + '    </body>');
fs.writeFileSync('src/locale/messages.de.xlf', updatedDe);
console.log(`Added ${missingIds.length} missing units to messages.de.xlf`);
