const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const getVersion = () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));
  const pkgVersion = pkg.version.replace(/^v/, '');
  
  let hash = '';
  try {
    hash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    // Fallback if git is not available
    hash = process.env['CD_BUILD_ID'] || process.env['BUILD_NUMBER'] || process.env['BUILD_ID'] || 'dev';
  }

  return `${pkgVersion}-${hash}`;
};

process.stdout.write(getVersion());
