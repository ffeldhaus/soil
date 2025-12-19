#!/bin/bash
# Start angular in background
./node_modules/.bin/ng serve --port 4200 > serve.log 2>&1 &
PID=$!

# Wait for 4200
echo "Waiting for localhost:4200..."
max_retries=60
counter=0
while ! curl -s http://localhost:4200 > /dev/null; do
    sleep 2
    counter=$((counter+1))
    if [ $counter -ge $max_retries ]; then
        echo "Timeout waiting for ng serve"
        kill $PID
        exit 1
    fi
    echo -n "."
done

echo ""
echo "Server is up. Running Cypress..."
./node_modules/.bin/cypress run > cypress.log 2>&1
EXIT_CODE=$?

echo "Cypress finished with code $EXIT_CODE"
kill $PID
exit $EXIT_CODE
