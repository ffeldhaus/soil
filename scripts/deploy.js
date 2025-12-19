const fs = require('fs');
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

    try {
        console.log('Building with localization...');
        execSync('ng build --localize', { stdio: 'inherit' });

        console.log('Deploying to Firebase...');
        execSync('npx firebase deploy', { stdio: 'inherit' });

        console.log('Deployment complete!');
    } catch (error) {
        console.error('Deployment failed:', error.message);
        process.exit(1);
    }
});
