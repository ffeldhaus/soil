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

    // Update src/index.html
    const indexHtmlPath = 'src/index.html';
    if (fs.existsSync(indexHtmlPath)) {
        let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
        indexHtml = indexHtml.replace(/(<meta name="app-version" content=")[^"]+(")/, `$1${newVersion}$2`);
        fs.writeFileSync(indexHtmlPath, indexHtml);
        console.log(`Updated src/index.html to version ${newVersion}`);
    }

    rl.close();

    const nodePath = '/Users/florianfeldhaus/.nvm/versions/node/v24.12.0/bin/node';
    const ngPath = './node_modules/@angular/cli/bin/ng.js';
    const firebasePath = './node_modules/firebase-tools/lib/bin/firebase.js';

    try {
        console.log('Building with localization...');
        execSync(`${nodePath} ${ngPath} build --localize`, { stdio: 'inherit' });

        // Copy public assets to root (dist/soil/browser) to ensure they are served correctly
        // despite localized subfolders.
        const publicDir = 'public';
        const outputDir = 'dist/soil/browser';
        if (fs.existsSync(publicDir)) {
            console.log('Copying public assets to root...');
            const files = fs.readdirSync(publicDir);
            for (const file of files) {
                const srcPath = path.join(publicDir, file);
                const destPath = path.join(outputDir, file);
                if (fs.lstatSync(srcPath).isFile()) {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }

        // Copy service worker files from default locale (en-US) to root
        const enUsDir = 'dist/soil/browser/en-US';
        const swFiles = ['ngsw-worker.js', 'ngsw.json'];
        if (fs.existsSync(enUsDir)) {
            console.log('Copying service worker files to root...');
            for (const file of swFiles) {
                const srcPath = path.join(enUsDir, file);
                const destPath = path.join(outputDir, file);
                if (fs.existsSync(srcPath)) {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        }

        console.log('Deploying to Firebase...');
        const binDir = '/Users/florianfeldhaus/.nvm/versions/node/v24.12.0/bin';
        execSync(`${nodePath} ${firebasePath} deploy`, {
            stdio: 'inherit',
            env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` }
        });

        console.log('Deployment complete!');
    } catch (error) {
        console.error('Deployment failed:', error.message);
        process.exit(1);
    }
});
