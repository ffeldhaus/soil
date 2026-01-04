const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const { resolve } = require('path');

const getVersion = () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8'));
  const pkgVersion = pkg.version;
  try {
    const gitVersion = execSync('git describe --tags --always').toString().trim().replace(/^v/, '');
    const buildId = process.env['CD_BUILD_ID'] || process.env['BUILD_NUMBER'] || process.env['BUILD_ID'] || '';
    return buildId ? `${gitVersion}+${buildId}` : gitVersion;
  } catch {
    return pkgVersion.replace(/^v/, '');
  }
};

process.stdout.write(getVersion());
