#!/bin/sh
set -e

# Start Hardhat node
echo "Hardhat node starten..."
npx hardhat node --hostname 0.0.0.0 &
NODE_PID=$!

# Wacht tot de node bereikbaar is
echo "Wachten op Hardhat node..."
until wget -qO- \
  --post-data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  --header 'Content-Type: application/json' \
  http://127.0.0.1:8545 > /dev/null 2>&1; do
  sleep 1
done
echo "Hardhat node is bereikbaar."

# Deploy het contract
echo "Contract deployen..."
npx hardhat run scripts/deploy.js --network localhost
echo "Contract gedeployed op 0x5FbDB2315678afecb367f032d93F642f64180aa3"

wait $NODE_PID
