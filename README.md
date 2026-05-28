# Osso.nl — Transparant woningbiedplatform

Osso.nl is een woningbiedplatform waarbij alle biedingen via de blockchain vastgelegd worden. Makelaars kunnen woningen registreren en veilingen starten. Bieders kunnen transparant en onveranderbaar bieden via een smart contract op de blockchain.

## Tech stack

| Laag | Technologie |
|------|------------|
| Frontend | React + Vite + TypeScript + MUI |
| Backend | FastAPI (Python 3.13) |
| Database | MySQL 8 |
| Blockchain | Hardhat + Solidity (lokaal) / Polygon (productie) |
| Containerisatie | Docker + Docker Compose |

---

## Vereisten

Zorg dat het volgende geïnstalleerd is voordat je begint:

### 1. Git
Download via [git-scm.com](https://git-scm.com/downloads) of controleer of het al geïnstalleerd is:
```bash
git --version
```

### 2. Docker Desktop
Docker Desktop bevat zowel Docker als Docker Compose.

- **Mac**: [Download Docker Desktop voor Mac](https://www.docker.com/products/docker-desktop/)
- **Windows**: [Download Docker Desktop voor Windows](https://www.docker.com/products/docker-desktop/)
- **Linux**: Volg de [officiële instructies](https://docs.docker.com/engine/install/)

Na installatie: open Docker Desktop en wacht tot de engine groen is (running).

Controleer de installatie:
```bash
docker --version
docker compose version
```

---

## Installatie & opstarten

### Stap 1 — Repository clonen

```bash
git clone https://github.com/jouw-gebruikersnaam/osso.nl.git
cd osso.nl
```

### Stap 2 — Opstarten met Docker

```bash
docker compose up --build
```

Dit commando:
1. Bouwt alle Docker images (frontend, backend, blockchain)
2. Start een lokale MySQL database
3. Start een lokale Hardhat blockchain node en deployt de smart contracts
4. Maakt automatisch de database tabellen aan
5. Vult de database met twee demo-gebruikers

> De eerste keer duurt het 2–5 minuten omdat alle dependencies gedownload worden.

### Stap 3 — App openen

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **API docs** | http://localhost:8000/api/docs |
| **Blockchain RPC** | http://localhost:8545 |

---

## Inloggegevens

| Naam | E-mail | Wachtwoord | Rol |
|------|--------|-----------|-----|
| Lars | `Lars@osso.nl` | `Demo1234!` | Makelaar |
| Louisa | `louisa@osso.nl` | `Demo1234!` | Makelaar |

---

## Gebruik

### Als makelaar (Lars of Louisa)
1. Log in via http://localhost:5173/login
2. Ga naar **Verkoperspaneel**
3. Registreer een woning via het formulier
4. Start een biedproces door een woning te koppelen aan een veiling
5. Nodig bieders uit door hun e-mailadres toe te voegen

### Als bieder
1. Registreer via http://localhost:5173/register
2. Doorloop de iDIN-verificatie (mock in lokale omgeving)
3. Breng een bod uit — dit wordt via de blockchain vastgelegd

---

## Dagelijks gebruik (na eerste keer)

```bash
# Opstarten
docker compose up

# Stoppen
docker compose down

# Stoppen + database wissen (reset naar beginstand)
docker compose down -v
```

> **Let op:** `docker compose down -v` verwijdert alle data inclusief de database. Daarna wordt de seed opnieuw uitgevoerd bij de volgende `docker compose up`.

---

## Project structuur

```
osso.nl/
├── frontend/          # React + Vite applicatie
│   ├── src/
│   │   ├── pages/     # Pagina-componenten
│   │   ├── components/
│   │   └── lib/       # API client + context
│   ├── Dockerfile
│   └── nginx.conf
│
├── backend/           # FastAPI applicatie
│   ├── routers/       # API endpoints
│   ├── services/      # Blockchain event indexer
│   ├── blockchain/    # Web3 client
│   ├── models.py      # Database modellen
│   ├── seed.py        # Demo data
│   └── Dockerfile
│
├── blockchain/        # Hardhat smart contracts
│   ├── contracts/     # Solidity contracten
│   ├── scripts/       # Deploy scripts
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Veelvoorkomende problemen

### Poort al in gebruik
Als je een foutmelding krijgt zoals `port is already allocated`, draait er al iets op die poort. Stop de conflicterende service of pas de poorten aan in `docker-compose.yml`.

### Containers starten niet op
Zorg dat Docker Desktop actief is (groen icoon in de taakbalk).

### Database reset nodig
```bash
docker compose down -v
docker compose up --build
```

### Frontend toont oude data na herstart
Open de browser in incognito modus (`Cmd+Shift+N` op Mac, `Ctrl+Shift+N` op Windows) om een verse sessie te starten zonder opgeslagen tokens.

---

## Blockchain details

De lokale Hardhat blockchain gebruikt vaste test-accounts. Het smart contract `OssoBidRegistry` wordt automatisch gedeployd op adres:

```
0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Alle biedingen worden on-chain vastgelegd en zijn te verifiëren via het **Blockchain Monitor** paneel in de app (alleen zichtbaar voor makelaars).

> ⚠️ De private keys in de lokale omgeving zijn publiek bekende Hardhat test-keys. Gebruik deze **nooit** op een live netwerk.
