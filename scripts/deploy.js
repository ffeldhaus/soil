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
    // Check for uncommitted changes
    const status = execSync('git status --porcelain').toString().trim();
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

    execSync(`git commit -m "v${newVersion}"`, { stdio: 'inherit' });
    execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { stdio: 'inherit' });
    execSync('git push origin main --tags', { stdio: 'inherit' });

    const firebasePath = './node_modules/.bin/firebase';
    execSync(`${firebasePath} deploy --only functions,firestore,storage`, {
      stdio: 'inherit',
    });

    await monitorCloudBuild(newVersion);
  } catch (error) {
    console.error('Deployment or Git operation failed:', error.message);
    process.exit(1);
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
