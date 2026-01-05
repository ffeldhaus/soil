const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

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
      console.warn('\x1b[33m%s\x1b[0m', 'WARNING: You have uncommitted changes:');
      console.log(status);

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const proceed = await new Promise((resolve) => {
        rl.question('Do you want to proceed with the release anyway? (y/N): ', (answer) => {
          resolve(answer.trim().toLowerCase() === 'y');
        });
      });

      rl.close();

      if (!proceed) {
        console.log('Deployment aborted.');
        process.exit(1);
      }
    }

    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Updated package.json to version ${newVersion}`);

    console.log('Committing and tagging the new version...');
    execSync(`git add ${packageJsonPath}`, { stdio: 'inherit' });
    execSync(`git commit -m "v${newVersion}"`, { stdio: 'inherit' });
    execSync(`git tag -a v${newVersion} -m "v${newVersion}"`, { stdio: 'inherit' });
    console.log(`Successfully committed and tagged v${newVersion}`);

    const firebasePath = './node_modules/.bin/firebase';
    console.log('Deploying backend and rules to Firebase (App Hosting handles frontend)...');
    execSync(`${firebasePath} deploy --only functions,firestore,storage`, {
      stdio: 'inherit',
    });

    console.log('Deployment complete!');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const push = await new Promise((resolve) => {
      rl.question('Push to GitHub? (Y/n): ', (answer) => {
        resolve(answer.trim().toLowerCase() !== 'n');
      });
    });

    if (push) {
      console.log('Pushing to GitHub...');
      execSync('git push origin main --tags', { stdio: 'inherit' });
      console.log('Successfully pushed to GitHub.');

      await monitorCloudBuild(newVersion);
    } else {
      console.log(`IMPORTANT: Remember to push the new commit and tag to GitHub:`);
      console.log(`git push origin main --tags`);
    }

    rl.close();
    console.log('Note: Frontend deployment is handled automatically by App Hosting upon push to main.');
  } catch (error) {
    console.error('Deployment or Git operation failed:', error.message);
    process.exit(1);
  }
};

const monitorCloudBuild = async (version) => {
  const region = 'europe-west4';
  const timeoutMs = 2 * 60 * 1000; // 2 minutes
  const pollIntervalMs = 5000; // 5 seconds
  const startTime = Date.now();

  try {
    const commitHash = execSync('git rev-parse HEAD').toString().trim();
    console.log(`Monitoring Cloud Build for commit ${commitHash}...`);

    while (Date.now() - startTime < timeoutMs) {
      const buildsJson = execSync(`gcloud builds list --region=${region} --limit=10 --format="json"`, {
        stdio: ['pipe', 'pipe', 'ignore'],
      }).toString();

      const builds = JSON.parse(buildsJson);
      const build = builds.find((b) => b.source?.developerConnectConfig?.revision === commitHash);

      if (build) {
        console.log(`\x1b[32mBuild found! ID: ${build.id}\x1b[0m`);
        console.log('Streaming logs from Cloud Build...');

        try {
          execSync(`gcloud builds log ${build.id} --region=${region} --stream`, { stdio: 'inherit' });
          console.log('\x1b[32mCloud Build completed successfully!\x1b[0m');
        } catch (e) {
          console.error('\x1b[31mCloud Build failed or was interrupted.\x1b[0m');
        }
        return;
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\rWaiting for build to start... (${elapsed}s)`);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    console.log('\n\x1b[31mTimeout: No new Cloud Build started within 2 minutes.\x1b[0m');
    console.log('Please check the Google Cloud Console manually.');
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

  console.log(`Current version: ${currentVersion}`);
  const nextPatch = increments.patch;
  rl.question(`Enter new version (default ${nextPatch}): `, (answer) => {
    const newVersion = answer.trim() || nextPatch;
    rl.close();
    performDeployment(newVersion);
  });
}
