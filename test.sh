cd backend
\. $HOME/.local/bin/env
uv run pytest
cd ..
cd frontend
unset NPM_CONFIG_PREFIX
\. "$HOME/.nvm/nvm.sh"
nvm use
npm run test