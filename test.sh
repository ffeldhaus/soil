cd backend
\. $HOME/.local/bin/env
uv run pytest
cd ..
cd frontend
unset NPM_CONFIG_PREFIX
\. "$HOME/.nvm/nvm.sh"
nvm use
npm run test
FRONTEND_TEST_STATUS=$?
echo "Frontend tests finished with status: $FRONTEND_TEST_STATUS"

# Navigate back to root for E2E tests
cd ..

# Exit immediately if frontend tests failed
if [ $FRONTEND_TEST_STATUS -ne 0 ]; then
  echo "Frontend tests failed, skipping E2E tests."
  exit $FRONTEND_TEST_STATUS
fi

echo "Preparing for E2E tests with Firebase Emulators..."

# Ensure nvm is available, though it should be from previous frontend steps
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
# nvm use $(cat frontend/.nvmrc) # This should ideally be set up by dev_setup.sh for the whole session

echo "Starting Firebase Emulators in background..."
(cd frontend && npm run firebase:start &)
EMULATOR_PID=$!
echo "Firebase Emulators process started with PID $EMULATOR_PID."
echo "Waiting for emulators to initialize (e.g., 15 seconds)..."
sleep 15 # Basic wait time, consider a more robust health check for CI

# Function to stop emulators
stop_emulators() {
    echo "Stopping Firebase emulators (Original PID: $EMULATOR_PID)..."
    # Attempt to kill the process group of the backgrounded npm script
    if ps -p $EMULATOR_PID > /dev/null; then
        echo "Attempting to kill process group for PID $EMULATOR_PID..."
        kill -SIGTERM -$EMULATOR_PID # Kill the process group
        wait $EMULATOR_PID 2>/dev/null
    else
        echo "Emulator process with PID $EMULATOR_PID not found. May have already exited."
    fi

    # As a fallback or additional measure, run the explicit stop script
    echo "Executing 'npm run firebase:stop' from frontend directory as a fallback..."
    if [ -d "frontend" ]; then
      (cd frontend && npm run firebase:stop)
    else
      echo "Frontend directory not found, cannot run firebase:stop."
    fi

    # Additional cleanup for known ports, just in case (use with caution)
    # echo "Ensuring all known emulator ports are free..."
    # lsof -t -i:9099 -i:8080 -i:5001 -i:9000 -i:5000 -i:8085 -i:9199 -i:4000 | xargs -r kill -9
}

# Set up trap to run stop_emulators on script exit (normal or error) or interrupt
trap stop_emulators EXIT SIGINT SIGTERM

echo "Running E2E tests using Cypress..."
# Prefer local Cypress binary from frontend dependencies
if [ -f "frontend/node_modules/.bin/cypress" ]; then
    frontend/node_modules/.bin/cypress run
else
    # Fallback if cypress is installed globally or npx can find it
    echo "Local Cypress binary not found, trying npx cypress run..."
    npx cypress run
fi
E2E_TEST_STATUS=$?

echo "E2E tests finished with status: $E2E_TEST_STATUS"

# The trap will call stop_emulators.
# Explicitly exit with E2E test status
exit $E2E_TEST_STATUS