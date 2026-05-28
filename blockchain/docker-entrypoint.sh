#!/bin/sh
set -e

# Start Hardhat node op de achtergrond
npx hardhat node --hostname 0.0.0.0 &
NODE_PID=$!

# Wacht tot de node bereikbaar is
echo "Wachten op Hardhat node..."
until npx hardhat run scripts/deploy.js --network localhost 2>/dev/null; do
  sleep 2
done

echo "Contracten gedeployed. Hardhat node blijft draaien."
wait $NODE_PID
