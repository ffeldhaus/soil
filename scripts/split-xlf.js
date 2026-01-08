const fs = require('fs');
const path = require('path');

function splitXlf(filePath, outputDir, baseName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const header = content.split('<body>')[0] + '<body>';
  const footer = '    </body>\n  </file>\n</xliff>';

  const transUnitRegex = /<trans-unit id="([^"]+)"[\s\S]*?<\/trans-unit>/g;
  let match;
  const groups = {
    admin: [],
    game: [],
    manual: [],
    common: []
  };

  const adminPrefixes = ['dashboard', 'superadmin', 'onboarding', 'adminLogin', 'adminRegister', 'authAction', 'user', 'feedback'];
  const gamePrefixes = ['board', 'finance', 'crop', 'roundResult', 'weather', 'pest', 'vermin', 'planting', 'parcel', 'sensitivity', 'ai'];
  const manualPrefixes = ['manual'];

  while ((match = transUnitRegex.exec(content)) !== null) {
    const id = match[1];
    const unit = match[0];
    const topLevel = id.split('.')[0];

    if (adminPrefixes.includes(topLevel)) {
      groups.admin.push(unit);
    } else if (gamePrefixes.includes(topLevel)) {
      groups.game.push(unit);
    } else if (manualPrefixes.includes(topLevel)) {
      groups.manual.push(unit);
    } else {
      groups.common.push(unit);
    }
  }

  for (const [name, units] of Object.entries(groups)) {
    if (units.length > 0) {
      const fileName = name === 'common' ? `${baseName}.xlf` : `${baseName}.${name}.xlf`;
      const filePath = path.join(outputDir, fileName);
      const fileContent = header + '\n      ' + units.join('\n      ') + '\n' + footer;
      fs.writeFileSync(filePath, fileContent);
      console.log(`Created ${filePath} with ${units.length} units.`);
    }
  }
}

const localeDir = 'src/locale';
splitXlf(path.join(localeDir, 'messages.xlf'), localeDir, 'messages');
splitXlf(path.join(localeDir, 'messages.en.xlf'), localeDir, 'messages.en');
