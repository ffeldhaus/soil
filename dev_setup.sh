# Install latest version of uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# add $HOME/.local/bin to PATH
source $HOME/.local/bin/env

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