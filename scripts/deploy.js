const fs = require('node:fs');
const _path = require('node:path');
const readline = require('node:readline');
const { execSync } = require('node:child_process');

const scriptStartTime = new Date();

const packageJsonPath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

const parts = currentVersion.split('.').map(Number);
const increments = {
  patch: `${parts[0]}.${parts[1]}.${parts[2] + 1}`,
  minor: `${parts[0]}.${parts[1] + 1}.0`,
  major: `${parts[0] + 1}.0.0`,
};

const arg = process.argv[2];
const newVersionRequested = increments[arg] || arg;

const performDeployment = async (newVersion) => {
  try {
    // Check for uncommitted changes (ignoring CHANGELOG.md)
    const status = execSync('git status --porcelain | grep -v "CHANGELOG.md" || true').toString().trim();
    if (status) {
      console.error(
        '\x1b[31m%s\x1b[0m',
        'ERROR: You have uncommitted changes. Please commit or stash them before releasing.',
      );
      console.log(status);
      process.exit(1);
    }

    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    execSync(`git add ${packageJsonPath}`, { stdio: 'inherit' });

    // Update angular.json
    const angularJsonPath = 'angular.json';
    const angularJson = JSON.parse(fs.readFileSync(angularJsonPath, 'utf8'));
    angularJson.projects.soil.architect.build.options.define['import.meta.env.APP_VERSION'] = `"${newVersion}"`;
    fs.writeFileSync(angularJsonPath, `${JSON.stringify(angularJson, null, 2)}\n`);
    execSync(`git add ${angularJsonPath}`, { stdio: 'inherit' });

    // Update src/index.html
    const indexHtmlPath = 'src/index.html';
    if (fs.existsSync(indexHtmlPath)) {
      let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
      indexHtml = indexHtml.replace(
        /<meta name="app-version" content="[^"]*" \/>/,
        `<meta name="app-version" content="${newVersion}" />`,
      );
      fs.writeFileSync(indexHtmlPath, indexHtml);
      execSync(`git add ${indexHtmlPath}`, { stdio: 'inherit' });
    }

    // Update iOS Xcode project version & build number
    const iosPbxprojPath = 'ios/App/App.xcodeproj/project.pbxproj';
    if (fs.existsSync(iosPbxprojPath)) {
      const vParts = newVersion.split('.').map(Number);
      const iosBuildVersion = vParts[0] * 100000 + vParts[1] * 1000 + vParts[2] * 10;
      let pbxproj = fs.readFileSync(iosPbxprojPath, 'utf8');
      pbxproj = pbxproj
        .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${newVersion};`)
        .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${iosBuildVersion};`);
      fs.writeFileSync(iosPbxprojPath, pbxproj);
      execSync(`git add ${iosPbxprojPath}`, { stdio: 'inherit' });
    }

    // Update CHANGELOG.md
    const changelogPath = 'CHANGELOG.md';
    const today = new Date().toISOString().split('T')[0];
    if (fs.existsSync(changelogPath)) {
      let changelog = fs.readFileSync(changelogPath, 'utf8');
      const unpublishedRegex = /##\s*\[Unpublished\]/i;

      if (unpublishedRegex.test(changelog)) {
        changelog = changelog.replace(unpublishedRegex, `## [${newVersion}] - ${today}`);
        fs.writeFileSync(changelogPath, changelog);
        execSync(`git add ${changelogPath}`, { stdio: 'inherit' });
        console.log(`Updated CHANGELOG.md with version ${newVersion} and date ${today}`);
      } else {
        console.warn('WARNING: No [Unpublished] entry found in CHANGELOG.md. Skipping changelog update.');
      }
    }

    // Update public/sitemap.xml and src/server.ts <lastmod>
    for (const sitemapTarget of ['public/sitemap.xml', 'src/server.ts']) {
      if (fs.existsSync(sitemapTarget)) {
        let content = fs.readFileSync(sitemapTarget, 'utf8');
        content = content.replace(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g, `<lastmod>${today}</lastmod>`);
        fs.writeFileSync(sitemapTarget, content);
        execSync(`git add ${sitemapTarget}`, { stdio: 'inherit' });
      }
    }

    // Update CITATION.cff and codemeta.json version & release date
    const citationPath = 'CITATION.cff';
    if (fs.existsSync(citationPath)) {
      let citation = fs.readFileSync(citationPath, 'utf8');
      citation = citation
        .replace(/^version: ".*"$/m, `version: "${newVersion}"`)
        .replace(/^date-released: ".*"$/m, `date-released: "${today}"`);
      fs.writeFileSync(citationPath, citation);
      execSync(`git add ${citationPath}`, { stdio: 'inherit' });
    }
    const codemetaPath = 'codemeta.json';
    if (fs.existsSync(codemetaPath)) {
      const codemeta = JSON.parse(fs.readFileSync(codemetaPath, 'utf8'));
      codemeta.version = newVersion;
      codemeta.dateModified = today;
      fs.writeFileSync(codemetaPath, `${JSON.stringify(codemeta, null, 2)}\n`);
      execSync(`git add ${codemetaPath}`, { stdio: 'inherit' });
    }

    execSync(`git commit -m "v${newVersion}"`, { stdio: 'inherit' });
    execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { stdio: 'inherit' });
    execSync('git push origin main --tags', { stdio: 'inherit' });

    const firebasePath = './node_modules/.bin/firebase';
    execSync(`${firebasePath} deploy --only functions,firestore,storage`, {
      stdio: 'inherit',
    });

    await monitorCloudBuild(newVersion);
    await notifyIndexNow();
  } catch (error) {
    console.error('Deployment or Git operation failed:', error.message);
    process.exit(1);
  }
};

const INDEXNOW_KEY = '7f4c9e2a1b8d4f6e9c3a5b7d2e1f8a4c';
const INDEXNOW_URLS = [
  'https://soil.app/',
  'https://soil.app/trailer',
  'https://soil.app/manual',
  'https://soil.app/info',
  'https://soil.app/research',
  'https://soil.app/admin',
];

const notifyIndexNow = async () => {
  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        host: 'soil.app',
        key: INDEXNOW_KEY,
        keyLocation: `https://soil.app/${INDEXNOW_KEY}.txt`,
        urlList: INDEXNOW_URLS,
      }),
    });

    if (response.ok || response.status === 202) {
      console.log(`IndexNow notified (${response.status}) for ${INDEXNOW_URLS.length} URLs.`);
    } else {
      console.warn(`IndexNow returned HTTP ${response.status}: ${await response.text()}`);
    }
  } catch (error) {
    console.warn('IndexNow notification skipped:', error.message);
  }
};

const monitorCloudBuild = async (_version) => {
  const region = 'europe-west4';
  const timeoutMs = 2 * 60 * 1000; // 2 minutes
  const pollIntervalMs = 5000; // 5 seconds
  const startTime = Date.now();

  try {
    while (Date.now() - startTime < timeoutMs) {
      const buildsJson = execSync(`gcloud builds list --region=${region} --limit=10 --format="json"`, {
        stdio: ['pipe', 'pipe', 'ignore'],
      }).toString();

      const builds = JSON.parse(buildsJson);
      // Find the latest build that started after our script started
      const build = builds.find((b) => {
        const createTime = new Date(b.createTime);
        return createTime > scriptStartTime;
      });

      if (build) {
        console.log(`\nFound build: ${build.id} (created at ${build.createTime})`);
        try {
          execSync(`gcloud beta builds log ${build.id} --region=${region} --stream`, { stdio: 'inherit' });
        } catch (_e) {
          console.error('\x1b[31mCloud Build failed or was interrupted.\x1b[0m');
        }
        return;
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\rWaiting for build to start... (${elapsed}s)`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    console.log('\nTimeout waiting for Cloud Build to start.');
  } catch (error) {
    console.error('Error monitoring Cloud Build:', error.message);
  }
};

if (newVersionRequested) {
  performDeployment(newVersionRequested);
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const nextPatch = increments.patch;
  rl.question(`Enter new version (default ${nextPatch}): `, (answer) => {
    const newVersion = answer.trim() || nextPatch;
    rl.close();
    performDeployment(newVersion);
  });
}
