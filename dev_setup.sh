# Install latest version of uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# add $HOME/.local/bin to PATH
\. $HOME/.local/bin/env

# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# nvm is not compatible with the "NPM_CONFIG_PREFIX" environment variable
unset NPM_CONFIG_PREFIX

# change to frontend directory
cd frontend

# Download, install and use Node.js version specified in .nvmrc
nvm install
nvm use

# install node packages
npm install

# change back to main app folder
cd ..

# Check if Firebase CLI is installed and install if not
echo "Checking Firebase CLI installation..."
if ! command -v firebase &> /dev/null
then
    echo "Firebase CLI not found, installing globally via npm..."
    npm install -g firebase-tools
    if ! command -v firebase &> /dev/null
    then
        echo "Firebase CLI installation failed. Please check npm output."
        # Optionally, exit here if Firebase CLI is critical
        # exit 1
    else
        echo "Firebase CLI installed successfully."
        firebase --version
    fi
else
    echo "Firebase CLI is already installed."
    firebase --version
fi

# use Firebase emulator for local development
export USE_FIREBASE_EMULATOR=true