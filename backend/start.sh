#!/bin/bash
# Start de Osso.nl FastAPI backend
# Gebruik: ./start.sh [--reload]

cd "$(dirname "$0")"

if ! command -v python3.13 &>/dev/null; then
  echo "Fout: python3.13 niet gevonden. Installeer Python 3.13."
  exit 1
fi

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "⚠  .env aangemaakt vanuit .env.example — pas de waarden aan!"
fi

echo "Osso.nl backend starten op http://localhost:8000"
echo "Swagger UI beschikbaar op http://localhost:8000/api/docs"
echo ""

if [ "$1" == "--reload" ]; then
  python3.13 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
else
  python3.13 -m uvicorn main:app --host 0.0.0.0 --port 8000
fi
