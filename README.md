# Osso.nl — Transparant woningbiedplatform

Osso.nl is een woningbiedplatform waarbij alle biedingen via de blockchain worden vastgelegd. Makelaars kunnen woningen registreren en veilingen starten. Bieders kunnen transparant en onveranderbaar bieden via een smart contract op de blockchain.

## Tech stack

| Laag | Technologie |
|------|------------|
| Frontend | React + Vite + TypeScript + MUI |
| Backend | FastAPI (Python 3.13) |
| Database | MySQL 8 |
| Blockchain | Hardhat + Solidity (lokaal) |
| Containerisatie | Docker + Docker Compose |

---

## Vereisten

Je hebt alleen **Git** en **Docker Desktop** nodig. Geen Python, Node.js of andere tools hoeven lokaal geïnstalleerd te zijn.

---

## Installatie op Windows (eerste keer)

### Stap 1 — Git installeren

Ga naar [git-scm.com/downloads](https://git-scm.com/downloads) en download de Windows-installer.

Installeer met de standaardinstellingen. Controleer daarna in een nieuw terminalvenster:

```
git --version
```

---

### Stap 2 — Docker Desktop installeren

1. Ga naar [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
2. Klik op **Download for Windows**
3. Voer de installer uit (`Docker Desktop Installer.exe`)
4. Tijdens de installatie: laat **"Use WSL 2 instead of Hyper-V"** aangevinkt staan (aanbevolen)
5. Start je pc opnieuw op als dat gevraagd wordt

**WSL 2 instellen (alleen als dat gevraagd wordt):**

Als Docker meldt dat WSL 2 niet geïnstalleerd is, open dan PowerShell als Administrator en voer uit:

```powershell
wsl --install
```

Herstart daarna je pc en open Docker Desktop opnieuw.

**Controleer of Docker werkt:**

Open een nieuw terminalvenster (Command Prompt of PowerShell) en typ:

```
docker --version
docker compose version
```

Beide commando's moeten een versienummer teruggeven. Zorg dat het Docker-icoon in de taakbalk **groen** is (Engine running) voordat je verder gaat.

---

### Stap 3 — Repository clonen

Open **Command Prompt** of **PowerShell** en voer uit:

```
git clone https://github.com/NiloyanSella7/Osso.nl.git
cd Osso.nl
```

---

### Stap 4 — Applicatie starten

```
docker compose up --build
```

Dit commando doet automatisch het volgende:

1. Downloadt alle benodigde images (Node, Python, MySQL, Nginx)
2. Bouwt de frontend, backend en blockchain containers
3. Start een lokale MySQL database
4. Start een lokale Hardhat blockchain node en deployt het smart contract
5. Maakt de databasetabellen aan
6. Vult de database met twee demo-makelaars

> **De eerste keer duurt dit 3–8 minuten** omdat alle dependencies worden gedownload. Je ziet veel logs voorbijkomen — dit is normaal.

Wacht tot je in de logs ziet:

```
ossonl-frontend-1  | ...nginx...
```

Dan is alles klaar.

---

### Stap 5 — App openen

Open je browser en ga naar:

| Service | URL |
|---------|-----|
| **Frontend (app)** | http://localhost:3000 |
| **API documentatie** | http://localhost:8000/api/docs |
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

1. Log in via http://localhost:3000/login
2. Ga naar **Verkoperspaneel**
3. Registreer een woning via het formulier
4. Start een veiling en stel een deadline in
5. Voeg bieders toe via e-mailadres — zij ontvangen een uitnodiging

### Als bieder

1. Ontvang een uitnodiging van de makelaar (of registreer via de uitnodigingslink)
2. Log in en voltooi de iDIN-verificatie (in lokale omgeving is dit een mock — klik gewoon op bevestigen)
3. Breng een bod uit — dit wordt vastgelegd op de blockchain
4. Na het verstrijken van de deadline zijn alle bedragen zichtbaar in de biedhistorie

---

## Dagelijks gebruik (na de eerste keer)

```bash
# Starten (zonder herbouwen)
docker compose up

# Stoppen
docker compose down

# Volledig reset (wist alle data, begint opnieuw)
docker compose down -v
docker compose up --build
```

> `docker compose down -v` verwijdert de database én de blockchain. Bij de volgende opstart worden de demo-gebruikers automatisch opnieuw aangemaakt.

---

## Projectstructuur

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

### "Port is already allocated"

Er draait al iets op poort 3000, 3306, 8000 of 8545. Stop de conflicterende service of herstart Docker Desktop.

### Docker meldt dat WSL 2 ontbreekt

Open PowerShell als Administrator:

```powershell
wsl --install
```

Herstart je pc en open Docker Desktop opnieuw.

### Containers starten niet op

- Zorg dat Docker Desktop open staat en het icoon in de taakbalk groen is
- Probeer: `docker compose down` gevolgd door `docker compose up --build`

### "dependency failed to start" bij opstarten

De blockchain container was niet op tijd klaar. Wacht even en probeer opnieuw:

```
docker compose up
```

### Frontend toont oude data / inloggen mislukt na reset

Open de browser in incognito modus (`Ctrl+Shift+N`) om een verse sessie te starten zonder opgeslagen tokens.

### Biedingen zijn verdwenen na herstart

De lokale Hardhat blockchain is in-memory en reset bij elke herstart van de container. Dit is normaal gedrag in de lokale omgeving. Bieders moeten na een herstart opnieuw bieden. Gebruik `docker compose up` (zonder `-v`) om de MySQL-data te bewaren.

---

## Blockchain details

De lokale Hardhat blockchain gebruikt vaste test-accounts. Het smart contract `OssoBidRegistry` wordt automatisch gedeployd bij elke opstart op adres:

```
0x5FbDB2315678afecb367f032d93F642f64180aa3
```

Alle biedingen worden on-chain vastgelegd en zijn te verifiëren via het **Blockchain Monitor** paneel in de app (alleen zichtbaar voor makelaars na inloggen).

> ⚠️ De private keys in de lokale omgeving zijn publiek bekende Hardhat test-keys. Gebruik deze **nooit** op een live netwerk.
