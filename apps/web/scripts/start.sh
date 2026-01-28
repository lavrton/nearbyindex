#!/bin/sh

# Start script for running both web and worker in the same container

echo "Starting NearbyIndex..."
echo "======================="

# Function to handle shutdown
cleanup() {
    echo "Shutting down..."
    kill $WEB_PID $WORKER_PID 2>/dev/null
    wait
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the Next.js server
echo "Starting web server..."
node apps/web/server.js &
WEB_PID=$!

# Wait a moment for the web server to initialize
sleep 2

# Start the worker using tsx from node_modules
echo "Starting background worker..."
cd apps/web && node_modules/.bin/tsx scripts/worker.ts &
WORKER_PID=$!
cd /app

echo "Web server PID: $WEB_PID"
echo "Worker PID: $WORKER_PID"
echo ""
echo "Both services running. Press Ctrl+C to stop."

# Wait for either process to exit
wait -n $WEB_PID $WORKER_PID

# If one exits, kill the other
echo "A process exited, shutting down..."
cleanup
