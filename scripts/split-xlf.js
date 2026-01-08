const fs = require('node:fs');
const path = require('node:path');

function splitXlf(filePath, outputDir, baseName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const header = `${content.split('<body>')[0]}<body>`;
  const footer = '    </body>\n  </file>\n</xliff>';

  const transUnitRegex = /<trans-unit id="([^"]+)"[\s\S]*?<\/trans-unit>/g;
  let match;
  const groups = {
    'admin.dashboard': [],
    'admin.superadmin': [],
    'admin.auth': [],
    'admin.onboarding': [],
    game: [],
    manual: [],
    common: [],
  };

  const adminDashboardPrefixes = ['dashboard', 'feedback', 'user'];
  const adminSuperAdminPrefixes = ['superadmin'];
  const adminAuthPrefixes = ['adminLogin', 'adminRegister', 'authAction'];
  const adminOnboardingPrefixes = ['onboarding'];
  const gamePrefixes = [
    'board',
    'finance',
    'crop',
    'roundResult',
    'weather',
    'pest',
    'vermin',
    'planting',
    'parcel',
    'sensitivity',
    'ai',
  ];
  const manualPrefixes = ['manual'];

  while ((match = transUnitRegex.exec(content)) !== null) {
    const id = match[1];
    const unit = match[0];
    const topLevel = id.split('.')[0];

    if (adminDashboardPrefixes.includes(topLevel)) {
      groups['admin.dashboard'].push(unit);
    } else if (adminSuperAdminPrefixes.includes(topLevel)) {
      groups['admin.superadmin'].push(unit);
    } else if (adminAuthPrefixes.includes(topLevel)) {
      groups['admin.auth'].push(unit);
    } else if (adminOnboardingPrefixes.includes(topLevel)) {
      groups['admin.onboarding'].push(unit);
    } else if (gamePrefixes.includes(topLevel)) {
      groups.game.push(unit);
    } else if (manualPrefixes.includes(topLevel)) {
      groups.manual.push(unit);
    } else {
      groups.common.push(unit);
    }
  }

  for (const [name, units] of Object.entries(groups)) {
    const fileName = name === 'common' ? `${baseName}.xlf` : `${baseName}.${name}.xlf`;
    const filePath = path.join(outputDir, fileName);
    const fileContent = `${header}\n      ${units.join('\n      ')}\n${footer}`;
    fs.writeFileSync(filePath, fileContent);
  }
}

const localeDir = 'src/locale';
splitXlf(path.join(localeDir, 'messages.xlf'), localeDir, 'messages');
splitXlf(path.join(localeDir, 'messages.en.xlf'), localeDir, 'messages.en');
