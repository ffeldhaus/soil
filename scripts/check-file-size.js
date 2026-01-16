const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const warnSize = 128 * 1024; // 128KB
const errorSize = 256 * 1024; // 256KB

const exceptions = ['package-lock.json', 'dist/', '.angular/', 'coverage/', '.xlf'];

const includedExtensions = ['.ts', '.html', '.scss', '.css', '.js', '.md', '.json', '.xlf'];

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.split('\n').filter((file) => file.trim() !== '');
  } catch (error) {
    console.error('Error getting staged files:', error);
    return [];
  }
}

function isException(file) {
  return exceptions.some((exception) => file.includes(exception));
}

function isIncluded(file) {
  const ext = path.extname(file);
  return includedExtensions.includes(ext);
}

const stagedFiles = getStagedFiles();
let hasError = false;

stagedFiles.forEach((file) => {
  if (isException(file) || !isIncluded(file)) {
    return;
  }

  if (!fs.existsSync(file)) {
    return;
  }

  const stats = fs.statSync(file);
  const size = stats.size;

  if (size > errorSize) {
    console.error(
      `\x1b[31mERROR: File "${file}" is too large (${(size / 1024).toFixed(2)}KB). Max allowed is 256KB.\x1b[0m`,
    );
    hasError = true;
  } else if (size > warnSize) {
    console.warn(
      `\x1b[33mWARNING: File "${file}" is large (${(size / 1024).toFixed(2)}KB). Consider breaking it up. Max recommended is 128KB.\x1b[0m`,
    );
  }
});

if (hasError) {
  process.exit(1);
}
