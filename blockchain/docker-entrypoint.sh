#!/bin/sh
set -e

STATE_FILE="/data/hardhat-state.json"
mkdir -p /data

# Start Hardhat node met persistente state
if [ -f "$STATE_FILE" ]; then
  echo "Bestaande blockchain state laden van $STATE_FILE..."
  npx hardhat node --hostname 0.0.0.0 --load-state "$STATE_FILE" &
else
  echo "Nieuwe blockchain starten..."
  npx hardhat node --hostname 0.0.0.0 &
fi

NODE_PID=$!

# Wacht tot de node bereikbaar is
echo "Wachten op Hardhat node..."
until wget -qO- --post-data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  --header 'Content-Type: application/json' http://localhost:8545 > /dev/null 2>&1; do
  sleep 1
done

# Deploy contracten alleen als er nog geen state is
if [ ! -f "$STATE_FILE" ]; then
  echo "Contracten deployen..."
  npx hardhat run scripts/deploy.js --network localhost
fi

echo "Blockchain gereed. State wordt elke 30 seconden opgeslagen."

# Sla state periodiek op zodat bids bewaard blijven na restart
while true; do
  sleep 30
  npx hardhat --network localhost node:save-state "$STATE_FILE" 2>/dev/null || \
  wget -qO- \
    --post-data "{\"jsonrpc\":\"2.0\",\"method\":\"hardhat_dumpState\",\"params\":[],\"id\":1}" \
    --header "Content-Type: application/json" \
    http://localhost:8545 > "$STATE_FILE" 2>/dev/null || true
done &

wait $NODE_PID
