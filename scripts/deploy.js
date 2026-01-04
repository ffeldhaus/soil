const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const packageJsonPath = 'package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`Current version: ${currentVersion}`);

const parts = currentVersion.split('.').map(Number);
const nextPatch = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;

rl.question(`Enter new version (default ${nextPatch}): `, (answer) => {
    const newVersion = answer.trim() || nextPatch;

    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Updated package.json to version ${newVersion}`);

    rl.close();

    const firebasePath = './node_modules/.bin/firebase';

    try {
        console.log('Deploying backend and rules to Firebase (App Hosting handles frontend)...');
        execSync(`${firebasePath} deploy --only functions,firestore,storage`, {
            stdio: 'inherit'
        });

        console.log('Deployment complete!');
        console.log('Note: Frontend deployment is handled automatically by App Hosting upon push to main.');
    } catch (error) {
        console.error('Deployment failed:', error.message);
        process.exit(1);
    }
});