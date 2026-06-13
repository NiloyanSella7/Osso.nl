"""
Blockchain client die communiceert met de Solidity smart contracts via web3.py.
Werkt met zowel een lokale Hardhat-node als het Polygon PoS netwerk.
"""

import json
from pathlib import Path

from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from config import settings

ABI_DIR = Path(__file__).parent / "abis"


def _load_abi(name: str) -> list:
    path = ABI_DIR / f"{name}.json"
    if not path.exists():
        return []
    with open(path) as f:
        return json.load(f)


class BlockchainClient:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.web3_provider_url))
        # PoA middleware vereist voor Polygon en Hardhat
        self.w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        self._connected = self.w3.is_connected()

        if self._connected and settings.backend_wallet_private_key != "0x" + "0" * 64:
            self.account = self.w3.eth.account.from_key(
                settings.backend_wallet_private_key
            )
        else:
            self.account = None

        self.registry = self._load_contract(
            "OssoBidRegistry", settings.osso_registry_address
        )
        # Legacy productie-contracten
        self.auction_manager = self._load_contract(
            "AuctionManager", settings.auction_manager_address
        )
        self.bid_escrow = self._load_contract("BidEscrow", settings.bid_escrow_address)
        self.kyc_gate = self._load_contract("KYCGate", settings.kyc_gate_address)

    def _load_contract(self, name: str, address: str):
        abi = _load_abi(name)
        if not abi or address == "0x" + "0" * 40:
            return None
        checksum = Web3.to_checksum_address(address)
        return self.w3.eth.contract(address=checksum, abi=abi)

    def _send_tx(self, fn):
        """Bouw en verstuurd een transactie namens de backend wallet."""
        if not self.account:
            raise RuntimeError("Backend wallet niet geconfigureerd")
        nonce = self.w3.eth.get_transaction_count(self.account.address)
        tx = fn.build_transaction(
            {
                "from": self.account.address,
                "nonce": nonce,
                "gas": 300_000,
                "gasPrice": self.w3.eth.gas_price,
            }
        )
        signed = self.w3.eth.account.sign_transaction(tx, self.account.key)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        return receipt

    # ── OssoBidRegistry ─────────────────────────────────────────────────────

    def place_bid(
        self,
        auction_id: int,
        bidder_wallet: str,
        amount_eurocents: int,
        financing_condition: bool,
    ) -> dict:
        """
        Registreert een bod onwijzigbaar op de blockchain via OssoBidRegistry.
        Retourneert: {'tx_hash': str, 'block_number': int}
        """
        if not self.registry:
            raise RuntimeError(
                "OssoBidRegistry contract niet geladen — controleer OSSO_REGISTRY_ADDRESS in .env"
            )
        if not self.account:
            raise RuntimeError(
                "Backend wallet niet geconfigureerd — controleer BACKEND_WALLET_PRIVATE_KEY in .env"
            )

        checksum_wallet = Web3.to_checksum_address(bidder_wallet)
        receipt = self._send_tx(
            self.registry.functions.placeBid(
                auction_id,
                checksum_wallet,
                amount_eurocents,
                financing_condition,
            )
        )
        return {
            "tx_hash": "0x" + receipt["transactionHash"].hex(),
            "block_number": receipt["blockNumber"],
        }

    def get_registry_bids(self, auction_id: int) -> list[dict]:
        """Haalt alle biedingen op uit OssoBidRegistry voor een veiling (read-only)."""
        if not self.registry:
            return []
        raw = self.registry.functions.getBids(auction_id).call()
        return [
            {
                "auction_id": b[0],
                "bidder_wallet": b[1].lower(),
                "amount_eurocents": b[2],
                "amount_eur": b[2] / 100,
                "financing_condition": b[3],
                "block_number": b[4],
                "timestamp": b[5],
            }
            for b in raw
        ]

    def get_all_bids(self) -> list[dict]:
        """Haalt alle biedingen op uit OssoBidRegistry over alle veilingen (auction_id 0-99)."""
        if not self.registry:
            return []
        all_bids = []
        for auction_id in range(100):
            try:
                bids = self.registry.functions.getBids(auction_id).call()
                all_bids.extend(bids)
                if len(bids) == 0 and auction_id > 10:
                    break
            except Exception:
                break
        return all_bids

    # ── AuctionManager ──────────────────────────────────────────────────────

    def create_auction(self, property_id: int, deadline: int) -> int:
        """Maakt een nieuwe veiling aan op de blockchain. Retourneert de contract auction ID."""
        if not self.auction_manager:
            raise RuntimeError("AuctionManager contract niet geladen")
        receipt = self._send_tx(
            self.auction_manager.functions.createAuction(property_id, deadline)
        )
        # Parse het AuctionCreated event om het on-chain ID te lezen
        events = self.auction_manager.events.AuctionCreated().process_receipt(receipt)
        if events:
            return events[0]["args"]["auctionId"]
        return 0

    def close_auction(self, contract_auction_id: int) -> str:
        """Sluit een veiling op de blockchain en wijst de winnaar aan."""
        if not self.auction_manager:
            raise RuntimeError("AuctionManager contract niet geladen")
        receipt = self._send_tx(
            self.auction_manager.functions.closeAuction(contract_auction_id)
        )
        return receipt["transactionHash"].hex()

    def get_auction_bids(self, contract_auction_id: int) -> list[dict]:
        """Haalt alle biedingen op uit het AuctionManager contract (read-only)."""
        if not self.auction_manager:
            return []
        raw = self.auction_manager.functions.getAuctionBids(contract_auction_id).call()
        return [
            {
                "bidder": b[0],
                "amount": float(b[1]) / 1e6,  # USDC heeft 6 decimalen
                "blockNumber": b[2],
                "transactionHash": b[3].hex() if isinstance(b[3], bytes) else b[3],
            }
            for b in raw
        ]

    # ── KYCGate ─────────────────────────────────────────────────────────────

    def add_to_whitelist(self, wallet_address: str) -> None:
        """Voegt een geverifieerd wallet-adres toe aan de KYCGate whitelist."""
        if not self.kyc_gate:
            raise RuntimeError("KYCGate contract niet geladen")
        checksum = Web3.to_checksum_address(wallet_address)
        self._send_tx(self.kyc_gate.functions.addToWhitelist(checksum))

    def remove_from_whitelist(self, wallet_address: str) -> None:
        """Verwijdert een wallet-adres van de KYCGate whitelist (AVG verwijderingsrecht)."""
        if not self.kyc_gate:
            raise RuntimeError("KYCGate contract niet geladen")
        checksum = Web3.to_checksum_address(wallet_address)
        self._send_tx(self.kyc_gate.functions.removeFromWhitelist(checksum))

    def is_whitelisted(self, wallet_address: str) -> bool:
        """Controleert of een wallet-adres op de whitelist staat."""
        if not self.kyc_gate:
            return False
        checksum = Web3.to_checksum_address(wallet_address)
        return self.kyc_gate.functions.isWhitelisted(checksum).call()

    @property
    def is_connected(self) -> bool:
        return self._connected


blockchain_client = BlockchainClient()
