const fs = require('node:fs');
const path = require('node:path');

const getVersion = () => {
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version.replace(/^v/, '');
};

process.stdout.write(getVersion());