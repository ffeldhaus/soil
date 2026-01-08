const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WARN_SIZE = 128 * 1024; // 128KB
const ERROR_SIZE = 256 * 1024; // 256KB

const EXCEPTIONS = [
  'package-lock.json',
  'dist/',
  '.angular/',
  'coverage/'
];

const INCLUDED_EXTENSIONS = [
  '.ts',
  '.html',
  '.scss',
  '.css',
  '.js',
  '.md',
  '.json',
  '.xlf'
];

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.split('\n').filter(file => file.trim() !== '');
  } catch (error) {
    console.error('Error getting staged files:', error);
    return [];
  }
}

function isException(file) {
  return EXCEPTIONS.some(exception => file.includes(exception));
}

function isIncluded(file) {
  const ext = path.extname(file);
  return INCLUDED_EXTENSIONS.includes(ext);
}

const stagedFiles = getStagedFiles();
let hasError = false;

stagedFiles.forEach(file => {
  if (isException(file) || !isIncluded(file)) {
    return;
  }

  if (!fs.existsSync(file)) {
    return;
  }

  const stats = fs.statSync(file);
  const size = stats.size;

  if (size > ERROR_SIZE) {
    console.error(`\x1b[31mERROR: File "${file}" is too large (${(size / 1024).toFixed(2)}KB). Max allowed is 256KB.\x1b[0m`);
    hasError = true;
  } else if (size > WARN_SIZE) {
    console.warn(`\x1b[33mWARNING: File "${file}" is large (${(size / 1024).toFixed(2)}KB). Consider breaking it up. Max recommended is 128KB.\x1b[0m`);
  }
});

if (hasError) {
  process.exit(1);
}
