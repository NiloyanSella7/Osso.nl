// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./KYCGate.sol";
import "./BidEscrow.sol";

/**
 * @title AuctionManager
 * @notice Centraal aanspreekpunt dat de levenscyclus van een veiling beheert.
 *         Registreert biedingen onwijzigbaar op de blockchain, dwingt de deadline
 *         technisch af en coördineert KYC-controle en fondsvergrendeling.
 *
 * Elke bieding genereert een BidPlaced-event dat door de backend-indexer wordt
 * opgepikt en weggeschreven naar MySQL voor snelle frontend-bevraging.
 */
contract AuctionManager is Ownable, ReentrancyGuard {
    KYCGate public immutable kycGate;
    BidEscrow public immutable bidEscrow;

    uint256 private _nextAuctionId = 1;

    struct Auction {
        uint256 propertyId;     // Off-chain referentie naar properties.id
        uint256 startTime;
        uint256 deadline;
        bool closed;
        address winner;
        address seller;
    }

    struct BidRecord {
        address bidder;
        uint256 amount;         // USDC in 6 decimalen
        uint256 blockNumber;
        bytes32 txHash;
    }

    // auctionId => Auction
    mapping(uint256 => Auction) public auctions;

    // auctionId => lijst van biedingen
    mapping(uint256 => BidRecord[]) private _bids;

    // auctionId => bidder => hoogste bod van die bieder
    mapping(uint256 => mapping(address => uint256)) private _highestBid;

    // Geautoriseerde verkopers/beheerders die veilingen mogen aanmaken
    mapping(address => bool) private _authorizedCreators;

    event AuctionCreated(uint256 indexed auctionId, uint256 propertyId, uint256 deadline);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount, uint256 blockNumber);
    event AuctionClosed(uint256 indexed auctionId, address indexed winner, uint256 winningAmount);
    event CreatorAuthorized(address indexed creator);

    modifier onlyAuthorizedCreator() {
        require(
            msg.sender == owner() || _authorizedCreators[msg.sender],
            "AuctionManager: niet geautoriseerd als aanmaker"
        );
        _;
    }

    modifier auctionExists(uint256 auctionId) {
        require(auctions[auctionId].deadline > 0, "AuctionManager: veiling bestaat niet");
        _;
    }

    modifier auctionOpen(uint256 auctionId) {
        require(!auctions[auctionId].closed, "AuctionManager: veiling is gesloten");
        require(block.timestamp >= auctions[auctionId].startTime, "AuctionManager: veiling is nog niet gestart");
        require(block.timestamp <= auctions[auctionId].deadline, "AuctionManager: deadline verstreken");
        _;
    }

    constructor(
        address initialOwner,
        address kycGateAddress,
        address bidEscrowAddress
    ) Ownable(initialOwner) {
        kycGate = KYCGate(kycGateAddress);
        bidEscrow = BidEscrow(bidEscrowAddress);
    }

    /**
     * @notice Maakt een nieuwe veiling aan op de blockchain.
     * @param propertyId Off-chain referentie naar properties.id in MySQL
     * @param startTime Unix timestamp van de startdatum
     * @param deadline Unix timestamp van de sluiting
     * @param seller Wallet-adres van de verkoper (ontvangt het winnende bod)
     * @return auctionId Het on-chain ID van de nieuw aangemaakte veiling
     */
    function createAuction(
        uint256 propertyId,
        uint256 startTime,
        uint256 deadline,
        address seller
    ) external onlyAuthorizedCreator returns (uint256) {
        require(deadline > startTime, "AuctionManager: deadline moet na startdatum liggen");
        require(deadline > block.timestamp, "AuctionManager: deadline ligt in het verleden");
        require(seller != address(0), "AuctionManager: ongeldig verkoperadres");

        uint256 auctionId = _nextAuctionId++;
        auctions[auctionId] = Auction({
            propertyId: propertyId,
            startTime: startTime,
            deadline: deadline,
            closed: false,
            winner: address(0),
            seller: seller
        });

        emit AuctionCreated(auctionId, propertyId, deadline);
        return auctionId;
    }

    /**
     * @notice Registreert een bod. Controleert KYC-status en vergrendelt het bedrag via BidEscrow.
     *         Biedingen na de deadline worden automatisch geweigerd door het netwerk.
     * @param auctionId Het on-chain ID van de veiling
     * @param amount Het bod-bedrag in USDC (6 decimalen, bijv. 290000 * 1e6 voor € 290.000)
     */
    function placeBid(uint256 auctionId, uint256 amount)
        external
        nonReentrant
        auctionExists(auctionId)
        auctionOpen(auctionId)
    {
        require(amount > 0, "AuctionManager: bod-bedrag moet positief zijn");
        require(kycGate.isWhitelisted(msg.sender), "AuctionManager: bieder niet geverifieerd via iDIN");

        // Vergrendel het bod-bedrag in BidEscrow
        // BidEscrow retourneert het vorige bod automatisch als er al een bod was
        bidEscrow.lockFunds(auctionId, msg.sender, amount);

        _bids[auctionId].push(BidRecord({
            bidder: msg.sender,
            amount: amount,
            blockNumber: block.number,
            txHash: blockhash(block.number - 1)
        }));

        _highestBid[auctionId][msg.sender] = amount;

        emit BidPlaced(auctionId, msg.sender, amount, block.number);
    }

    /**
     * @notice Sluit de veiling na het verstrijken van de deadline.
     *         Wijst de winnaar aan en verwerkt de fondsen automatisch.
     * @param auctionId Het on-chain ID van de veiling
     */
    function closeAuction(uint256 auctionId)
        external
        nonReentrant
        auctionExists(auctionId)
        onlyAuthorizedCreator
    {
        Auction storage auction = auctions[auctionId];
        require(!auction.closed, "AuctionManager: veiling is al gesloten");
        require(block.timestamp > auction.deadline, "AuctionManager: deadline is nog niet verstreken");

        auction.closed = true;

        BidRecord[] storage bids = _bids[auctionId];
        if (bids.length == 0) {
            emit AuctionClosed(auctionId, address(0), 0);
            return;
        }

        // Bepaal de winnaar op basis van het hoogste bod
        uint256 highestAmount = 0;
        address winner = address(0);
        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].amount > highestAmount) {
                highestAmount = bids[i].amount;
                winner = bids[i].bidder;
            }
        }

        auction.winner = winner;

        // Stel een array samen van verliezers voor bulk-refund
        address[] memory losers = new address[](bids.length);
        uint256 loserCount = 0;
        bool winnerSeen = false;
        for (uint256 i = 0; i < bids.length; i++) {
            if (bids[i].bidder == winner && !winnerSeen) {
                winnerSeen = true;
                continue;
            }
            losers[loserCount++] = bids[i].bidder;
        }

        // Verklein de array naar de werkelijke grootte
        address[] memory trimmedLosers = new address[](loserCount);
        for (uint256 i = 0; i < loserCount; i++) {
            trimmedLosers[i] = losers[i];
        }

        // Refund verliezers
        if (loserCount > 0) {
            bidEscrow.refundAll(auctionId, trimmedLosers);
        }

        // Stuur winnend bod naar de verkoper
        bidEscrow.releaseFunds(auctionId, winner, auction.seller);

        emit AuctionClosed(auctionId, winner, highestAmount);
    }

    /**
     * @notice Retourneert de volledige biedhistorie van een veiling.
     *         Kan door iedereen worden bevraagd voor on-chain verificatie.
     */
    function getAuctionBids(uint256 auctionId)
        external
        view
        auctionExists(auctionId)
        returns (BidRecord[] memory)
    {
        return _bids[auctionId];
    }

    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return auctions[auctionId];
    }

    function getBidCount(uint256 auctionId) external view returns (uint256) {
        return _bids[auctionId].length;
    }

    function authorizeCreator(address creator) external onlyOwner {
        _authorizedCreators[creator] = true;
        emit CreatorAuthorized(creator);
    }
}
