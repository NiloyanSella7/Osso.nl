workspace "Osso.nl" "Transparant woningbiedplatform met blockchain en Kafka message queue integratie" {

    !identifiers hierarchical

    model {

        # ── Actoren ────────────────────────────────────────────────────────────
        bieder = person "Bieder" "Koper die een bod uitbrengt op een woning na iDIN-verificatie"
        verkoper = person "Makelaar / Verkoper" "Plaatst woningen, start veilingen en bekijkt biedresultaten"
        admin = person "Beheerder" "Beheert gebruikers, KYC-verificaties en systeeminstellingen"

        # ── Extern systeem ─────────────────────────────────────────────────────
        idin = softwareSystem "iDIN" "Bankgebaseerde identiteitsverificatie voor Nederlandse burgers (mock in dev)" {
            tags "External"
        }

        # ── Hoofdsysteem ───────────────────────────────────────────────────────
        osso = softwareSystem "Osso.nl Platform" "Transparant woningbiedplatform. Biedingen worden onwijzigbaar geregistreerd op de blockchain via een Kafka message queue." {

            # ──────────────────────────────────────────────────────────────────
            # Container 1: Web Applicatie (React + TypeScript + Nginx)
            # ──────────────────────────────────────────────────────────────────
            frontend = container "Web Applicatie" "SPA voor bieders, verkopers en makelaars" "React 18 + TypeScript · Nginx · Port 3000" {
                tags "Frontend"

                loginPage         = component "Login / Registreer"    "Authenticatie en onboarding van gebruikers"                "React Page"
                woningOverzicht   = component "Woning Overzicht"       "Kaart- en lijstweergave van beschikbare woningen"          "React Page"
                woningDetail      = component "Woning Detail / Bieden" "Detailpagina met biedformulier en bodstatus"               "React Page"
                biedhistorie      = component "Biedhistorie"           "Transparante weergave van alle biedingen na deadline"      "React Page"
                blockchainMonitor = component "Blockchain Monitor"     "Realtime status en verificatie van blockchain transacties" "React Page"
                verkopersPaneel   = component "Verkopers Paneel"       "Beheer van woningen, veilingen en winnaaraanwijzing"       "React Page"
                apiClient         = component "API Client"             "Centrale HTTP-communicatielaag naar de Backend API"        "Axios / Fetch"
            }

            # ──────────────────────────────────────────────────────────────────
            # Container 2: Backend API (FastAPI + Python)
            # ──────────────────────────────────────────────────────────────────
            backendApi = container "Backend API" "REST API met Kafka Producer voor biedingen en Kafka Consumer voor event indexing" "FastAPI 0.111 · Python 3.13 · Port 8000" {
                tags "Backend"

                authRouter       = component "Auth Service"          "JWT-login, tokenvernieuwing en wachtwoordbeheer"              "POST /api/auth/login · /refresh"
                usersRouter      = component "Users Service"        "Gebruikersbeheer, iDIN-verificatie en wallet-koppeling"       "GET /api/users · PATCH /api/users/me"
                propertiesRouter = component "Properties Service"   "CRUD voor woningen, afbeeldingen en statusbeheer"             "GET /api/properties · POST /api/properties"
                auctionsRouter   = component "Auctions Service"     "Aanmaken en afsluiten van veilingen"                          "POST /api/auctions · /close"
                bidsRouter       = component "Bids Service"         "Valideert bod en publiceert via Kafka naar blockchain"        "POST /api/auctions/{id}/bids"
                makelaarsRouter  = component "Makelaars Service"    "Beheer van makelaarprofielen en invitaties"                   "GET /api/makelaars"
                blockchainRouter = component "Blockchain Service"   "Blockchain status, verificatie en on-chain biedingen lezen"  "GET /api/blockchain/status · /verify"

                kafkaProducer    = component "Kafka Producer"       "Publiceert bid.submit en auction.events berichten naar Kafka" "aiokafka AsyncProducer · Topic: blockchain.*"
                eventIndexer     = component "Event Indexer"        "Consumeert bid.confirmed events en indexeert deze in MySQL"   "aiokafka Consumer · asyncio achtergrondtaak"

                blockchainClient = component "Blockchain Client"    "Read-only web3.py verbinding voor statusopvragen en verificatie" "web3.py 7 · HTTPProvider"
                ormLayer         = component "ORM / Database Layer" "SQLAlchemy modellen: User, Property, Auction, IndexedBid, AuditLog" "SQLAlchemy 2 · PyMySQL"
            }

            # ──────────────────────────────────────────────────────────────────
            # Container 3: MySQL Database
            # ──────────────────────────────────────────────────────────────────
            database = container "MySQL Database" "Relationele database voor gebruikers, woningen, veilingen en bid-index (cache van blockchain — bod-bedragen NOOIT opgeslagen)" "MySQL 8.0 · Port 3306" {
                tags "Database"
            }

            # ──────────────────────────────────────────────────────────────────
            # Container 4: Apache Kafka (Message Broker)
            # ──────────────────────────────────────────────────────────────────
            kafka = container "Apache Kafka" "Asynchrone message broker die blockchain transactieverzoeken ontkoppelt van de API" "Apache Kafka 3.7 · KRaft mode · Port 9092" {
                tags "MessageBroker"

                bidSubmitTopic     = component "blockchain.bid.submit"     "Bied-opdrachten: auctionId, bidderWallet, amountEurocents, financingCondition"     "Kafka Topic · Partities: 3 · Replicatie: 1"
                bidConfirmedTopic  = component "blockchain.bid.confirmed"  "Bevestigde transacties: tx_hash, block_number, auctionId, bidderWallet"            "Kafka Topic · Partities: 3 · Replicatie: 1"
                auctionEventsTopic = component "blockchain.auction.events" "Veiling lifecycle events: AuctionCreated, AuctionClosed, OperatorChanged"          "Kafka Topic · Partities: 1 · Replicatie: 1"
            }

            # ──────────────────────────────────────────────────────────────────
            # Container 5: Blockchain Worker (Kafka Consumer → Blockchain)
            # ──────────────────────────────────────────────────────────────────
            blockchainWorker = container "Blockchain Worker" "Microservice die bid.submit berichten van Kafka verwerkt en signed transacties naar de blockchain stuurt" "Python 3.13 · aiokafka · web3.py · Port intern" {
                tags "Worker"

                bidConsumer    = component "Bid Consumer"         "Consumeert blockchain.bid.submit berichten en valideert de inhoud"  "aiokafka Consumer · Group: worker-group"
                txExecutor     = component "Transaction Executor" "Bouwt, signeert en verstuurt de Ethereum transactie namens operator wallet" "web3.py · eth_account · gas: 300,000"
                eventPublisher = component "Event Publisher"      "Publiceert tx_hash en block_number terug naar blockchain.bid.confirmed"   "aiokafka Producer"
                workerW3Client = component "Web3 Client"          "JSON-RPC verbinding met de Ethereum node"                               "web3.py HTTPProvider"
            }

            # ──────────────────────────────────────────────────────────────────
            # Container 6: Blockchain Node (Hardhat / Ethereum)
            # ──────────────────────────────────────────────────────────────────
            blockchainNode = container "Blockchain Node" "Lokale Ethereum testnode voor ontwikkeling. Productie: Polygon PoS netwerk" "Hardhat 2 · Ethereum EVM · Port 8545" {
                tags "Blockchain"

                ossoBidRegistry = component "OssoBidRegistry"  "Registreert biedingen onwijzigbaar. Enige bron van waarheid voor bod-bedragen (nooit in MySQL)" "Solidity 0.8.20 · placeBid() · getBids() · event BidPlaced"
                auctionManager  = component "AuctionManager"   "Beheert veiling lifecycle on-chain: aanmaken, sluiten en winnaar aanwijzen"                     "Solidity 0.8.20 · createAuction() · closeAuction()"
                bidEscrow       = component "BidEscrow"        "USDC escrow voor productie-variant (bieder stort USDC als zekerheid)"                           "Solidity 0.8.20 · OpenZeppelin SafeERC20"
                kycGate         = component "KYCGate"          "On-chain whitelist van iDIN-geverifieerde wallet-adressen"                                       "Solidity 0.8.20 · isWhitelisted() · addToWhitelist()"
            }
        }

        # ════════════════════════════════════════════════════════════════════
        # RELATIES — Systeem Context (Niveau 1)
        # ════════════════════════════════════════════════════════════════════
        bieder   -> osso "Bekijkt woningen en brengt biedingen uit" "HTTPS"
        verkoper -> osso "Plaatst woningen en beheert veilingen"    "HTTPS"
        admin    -> osso "Beheert gebruikers en KYC-verificaties"   "HTTPS"
        osso     -> idin "Verifieert identiteit van bieders"        "REST / iDIN Protocol"

        # ════════════════════════════════════════════════════════════════════
        # RELATIES — Container niveau (Niveau 2)
        # ════════════════════════════════════════════════════════════════════
        bieder   -> osso.frontend "Gebruikt via webbrowser"         "HTTPS :3000"
        verkoper -> osso.frontend "Gebruikt via webbrowser"         "HTTPS :3000"
        admin    -> osso.frontend "Gebruikt via webbrowser"         "HTTPS :3000"

        osso.frontend        -> osso.backendApi       "REST API calls (JSON)"                            "HTTPS :8000"
        osso.backendApi      -> osso.database         "Leest en schrijft gebruikers-, woning- en veilingdata" "TCP :3306 · SQLAlchemy"
        osso.backendApi      -> osso.kafka            "Publiceert bid.submit berichten"                  "TCP :9092 · aiokafka"
        osso.kafka           -> osso.blockchainWorker "Levert bid.submit berichten aan worker"           "TCP :9092 · Consumer Group"
        osso.blockchainWorker -> osso.blockchainNode  "Verstuurt signed Ethereum transacties"            "JSON-RPC :8545 · web3.py"
        osso.blockchainWorker -> osso.kafka           "Publiceert bid.confirmed (tx_hash + block_number)" "TCP :9092 · aiokafka"
        osso.kafka           -> osso.backendApi       "Levert bid.confirmed events aan Event Indexer"    "TCP :9092 · Consumer Group"
        osso.backendApi      -> osso.blockchainNode   "Read-only queries (status, verificatie, biedingen)" "JSON-RPC :8545 · web3.py"
        osso.backendApi      -> idin                  "Verifieert iDIN identiteit (mock in dev)"         "REST / iDIN"

        # ════════════════════════════════════════════════════════════════════
        # RELATIES — Component niveau Frontend (Niveau 3)
        # ════════════════════════════════════════════════════════════════════
        osso.frontend.loginPage         -> osso.frontend.apiClient "Verstuurt login- en registreerverzoeken"
        osso.frontend.woningOverzicht   -> osso.frontend.apiClient "Haalt lijst van actieve woningen op"
        osso.frontend.woningDetail      -> osso.frontend.apiClient "Verstuurt biedformulier en haalt veiling-status op"
        osso.frontend.biedhistorie      -> osso.frontend.apiClient "Haalt biedhistorie en bedragen op na deadline"
        osso.frontend.blockchainMonitor -> osso.frontend.apiClient "Haalt blockchain status en verificatie op"
        osso.frontend.verkopersPaneel   -> osso.frontend.apiClient "Beheert woningen, veilingen en sluit veilingen"
        osso.frontend.apiClient         -> osso.backendApi         "HTTP REST requests"                   "HTTPS :8000"

        # ════════════════════════════════════════════════════════════════════
        # RELATIES — Component niveau Backend API (Niveau 3)
        # ════════════════════════════════════════════════════════════════════
        osso.backendApi.bidsRouter       -> osso.backendApi.kafkaProducer    "Publiceert bid.submit event na validatie en iDIN-controle"
        osso.backendApi.bidsRouter       -> osso.backendApi.ormLayer         "Slaat bid-metadata op als index (GEEN bod-bedrag)"
        osso.backendApi.auctionsRouter   -> osso.backendApi.kafkaProducer    "Publiceert auction.events bij aanmaken/afsluiten"
        osso.backendApi.auctionsRouter   -> osso.backendApi.ormLayer         "Beheert veiling CRUD en statusupdates"
        osso.backendApi.propertiesRouter -> osso.backendApi.ormLayer         "Beheert woning CRUD en afbeeldingen"
        osso.backendApi.authRouter       -> osso.backendApi.ormLayer         "Valideert gebruikers en genereert JWT tokens"
        osso.backendApi.usersRouter      -> osso.backendApi.ormLayer         "Beheert gebruikersprofielen en iDIN-status"
        osso.backendApi.usersRouter      -> osso.backendApi.blockchainClient "Voegt geverifieerd wallet toe aan KYCGate whitelist"
        osso.backendApi.makelaarsRouter  -> osso.backendApi.ormLayer         "Beheert makelaarprofielen en invitaties"
        osso.backendApi.blockchainRouter -> osso.backendApi.blockchainClient "Raadpleegt on-chain status en biedingen voor verificatie"

        osso.backendApi.kafkaProducer    -> osso.kafka.bidSubmitTopic        "Publiceert bid.submit bericht"          "Kafka Producer :9092"
        osso.backendApi.kafkaProducer    -> osso.kafka.auctionEventsTopic    "Publiceert veiling lifecycle event"     "Kafka Producer :9092"
        osso.backendApi.eventIndexer     -> osso.kafka.bidConfirmedTopic     "Consumeert bevestigde transacties"      "Kafka Consumer :9092"
        osso.backendApi.eventIndexer     -> osso.backendApi.ormLayer         "Indexeert BidPlaced events in MySQL (tx_hash, block_number)"
        osso.backendApi.blockchainClient -> osso.blockchainNode              "Read-only JSON-RPC calls"               "JSON-RPC :8545"
        osso.backendApi.ormLayer         -> osso.database                    "CRUD via SQLAlchemy"                    "MySQL :3306"

        # ════════════════════════════════════════════════════════════════════
        # RELATIES — Component niveau Blockchain Worker (Niveau 3)
        # ════════════════════════════════════════════════════════════════════
        osso.blockchainWorker.bidConsumer    -> osso.kafka.bidSubmitTopic             "Consumeert bid.submit berichten"             "Kafka Consumer :9092"
        osso.blockchainWorker.bidConsumer    -> osso.blockchainWorker.txExecutor      "Geeft bid-opdracht door na validatie"
        osso.blockchainWorker.txExecutor     -> osso.blockchainWorker.workerW3Client  "Bouwt en signeert transactie"
        osso.blockchainWorker.workerW3Client -> osso.blockchainNode.ossoBidRegistry   "placeBid(auctionId, wallet, amount, condition)" "JSON-RPC :8545 · signed tx"
        osso.blockchainWorker.txExecutor     -> osso.blockchainWorker.eventPublisher  "Geeft ontvangst (tx_hash, block_number) door"
        osso.blockchainWorker.eventPublisher -> osso.kafka.bidConfirmedTopic          "Publiceert bevestigde transactie"            "Kafka Producer :9092"

        # ════════════════════════════════════════════════════════════════════
        # RELATIES — Component niveau Smart Contracts (Niveau 3)
        # ════════════════════════════════════════════════════════════════════
        osso.blockchainNode.ossoBidRegistry -> osso.blockchainNode.kycGate    "Controleert of bidderWallet op whitelist staat (productie)"
        osso.blockchainNode.auctionManager  -> osso.blockchainNode.bidEscrow  "Beheert USDC escrow depositering en teruggave (productie)"
    }

    views {

        # ── Niveau 1: Systeem Context ────────────────────────────────────────
        systemContext osso "L1_SystemContext" {
            include *
            autoLayout lr 200 100
            title "Niveau 1 — Systeem Context"
            description "Overzicht van Osso.nl en de actoren en externe systemen die ermee interageren."
        }

        # ── Niveau 2: Container Diagram ──────────────────────────────────────
        container osso "L2_Containers" {
            include *
            autoLayout lr 250 150
            title "Niveau 2 — Container Diagram"
            description "De zes containers van Osso.nl. Kafka ontkoppelt de Backend API van de blockchain zodat biedingen asynchroon verwerkt worden."
        }

        # ── Niveau 3: Backend API Componenten ────────────────────────────────
        component osso.backendApi "L3_Backend" {
            include *
            autoLayout lr 300 150
            title "Niveau 3 — Backend API Componenten"
            description "Interne opbouw van de FastAPI backend. De Bids Service publiceert via de Kafka Producer. De Event Indexer consumeert bid.confirmed events en schrijft naar MySQL."
        }

        # ── Niveau 3: Blockchain Worker Componenten ──────────────────────────
        component osso.blockchainWorker "L3_Worker" {
            include *
            autoLayout lr 250 150
            title "Niveau 3 — Blockchain Worker Componenten"
            description "De Worker leest bid.submit berichten van Kafka, voert de Ethereum transactie uit via de Transaction Executor en publiceert het resultaat terug als bid.confirmed."
        }

        # ── Niveau 3: Kafka Topics ───────────────────────────────────────────
        component osso.kafka "L3_Kafka" {
            include *
            autoLayout tb 200 150
            title "Niveau 3 — Kafka Message Broker Topics"
            description "De drie Kafka topics die de asynchrone koppeling tussen de Backend API, Blockchain Worker en Event Indexer verzorgen."
        }

        # ── Niveau 3: Smart Contracts ────────────────────────────────────────
        component osso.blockchainNode "L3_Blockchain" {
            include *
            autoLayout tb 200 150
            title "Niveau 3 — Smart Contracts (Blockchain Node)"
            description "De vier Solidity smart contracts op de Hardhat testnode. OssoBidRegistry is de enige bron van waarheid voor bod-bedragen."
        }

        # ── Styling ───────────────────────────────────────────────────────────
        styles {
            element "Element" {
                shape roundedbox
                strokeWidth 4
                color #ffffff
            }
            element "Person" {
                shape person
                background #1B4F72
                color #ffffff
                stroke #154360
                strokeWidth 5
            }
            element "External" {
                background #7D8C99
                color #ffffff
                stroke #5D6D7E
                shape roundedbox
            }
            element "Software System" {
                background #2C3E50
                color #ffffff
                stroke #1A252F
                shape roundedbox
            }
            element "Frontend" {
                background #2980B9
                color #ffffff
                stroke #1A5276
                shape roundedbox
                icon "https://cdn.simpleicons.org/react/ffffff"
            }
            element "Backend" {
                background #27AE60
                color #ffffff
                stroke #1E8449
                shape roundedbox
                icon "https://cdn.simpleicons.org/fastapi/ffffff"
            }
            element "Database" {
                shape cylinder
                background #E67E22
                color #ffffff
                stroke #CA6F1E
                icon "https://cdn.simpleicons.org/mysql/ffffff"
            }
            element "MessageBroker" {
                shape pipe
                background #C0392B
                color #ffffff
                stroke #922B21
                icon "https://cdn.simpleicons.org/apachekafka/ffffff"
            }
            element "Worker" {
                background #16A085
                color #ffffff
                stroke #0E6655
                shape roundedbox
                icon "https://cdn.simpleicons.org/python/ffffff"
            }
            element "Blockchain" {
                background #8E44AD
                color #ffffff
                stroke #6C3483
                shape roundedbox
                icon "https://cdn.simpleicons.org/ethereum/ffffff"
            }
            element "Component" {
                shape component
                background #2471A3
                color #ffffff
                stroke #1A5276
                strokeWidth 3
            }
            element "Boundary" {
                strokeWidth 5
            }
            relationship "Relationship" {
                thickness 4
                color #ffffff
            }
        }
    }

    configuration {
        scope softwaresystem
    }
}
