const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.join(process.cwd(), 'package.json');
const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

if (!fs.existsSync(packageJsonPath)) {
  console.error('package.json not found');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

if (!fs.existsSync(changelogPath)) {
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: CHANGELOG.md not found.');
  console.error('Please create CHANGELOG.md and add an entry for the current version.');
  process.exit(1);
}

const changelog = fs.readFileSync(changelogPath, 'utf8');

// Check for common changelog header formats:
// ## [2.6.9]
// ## 2.6.9
// # 2.6.9
// The regex looks for a line starting with one or more #, followed by optional [ and the version string or "Unpublished"
const escapedVersion = version.replace(/\./g, '\\.');
const versionRegex = new RegExp(`(^|\\n)#+ +\\[?(${escapedVersion}|Unpublished)\\]?`, 'i');

if (!versionRegex.test(changelog)) {
  console.error('\x1b[31m%s\x1b[0m', `ERROR: No entry found for version ${version} or [Unpublished] in CHANGELOG.md.`);
  console.error('Please add a header like "## [Unpublished]" to CHANGELOG.md.');
  process.exit(1);
}

// biome-ignore lint/suspicious/noConsole: Success message is intentional for CLI feedback
console.log(`Changelog entry for version ${version} found.`);
process.exit(0);
