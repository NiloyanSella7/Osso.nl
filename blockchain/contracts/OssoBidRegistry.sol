// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OssoBidRegistry
 * @notice PoC contract: de backend-operator registreert biedingen namens geverifieerde bieders.
 *         Elk bod wordt onwijzigbaar vastgelegd op de blockchain.
 *         Geen USDC vereist — geschikt voor demonstratie zonder echte tokens.
 *
 *         Productie-variant: AuctionManager.sol met BidEscrow (USDC) en KYCGate.
 */
contract OssoBidRegistry {
    address public operator;

    struct Bid {
        uint256 auctionId;
        address bidderWallet;
        uint256 amountEurocents; // Bod in eurocenten (bijv. 290000 * 100 = € 290.000)
        bool financingCondition;
        uint256 blockNumber;
        uint256 timestamp;
    }

    // auctionId => alle biedingen
    mapping(uint256 => Bid[]) private _bids;

    // Totaal aantal biedingen ooit geregistreerd
    uint256 public totalBids;

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidderWallet,
        uint256 amountEurocents,
        bool financingCondition,
        uint256 blockNumber,
        uint256 timestamp
    );

    event OperatorChanged(address indexed oldOperator, address indexed newOperator);

    modifier onlyOperator() {
        require(msg.sender == operator, "OssoBidRegistry: alleen operator");
        _;
    }

    constructor() {
        operator = msg.sender;
    }

    /**
     * @notice Registreert een bod namens een iDIN-geverifieerde bieder.
     * @param auctionId     Off-chain veiling-ID (overeenkomend met auctions.id in MySQL)
     * @param bidderWallet  Wallet-adres van de bieder
     * @param amountEurocents  Bod-bedrag in eurocenten
     * @param financingCondition  True als bod voorbehoud financiering heeft
     */
    function placeBid(
        uint256 auctionId,
        address bidderWallet,
        uint256 amountEurocents,
        bool financingCondition
    ) external onlyOperator {
        require(auctionId > 0, "OssoBidRegistry: ongeldig veiling-ID");
        require(bidderWallet != address(0), "OssoBidRegistry: ongeldig wallet-adres");
        require(amountEurocents > 0, "OssoBidRegistry: bod moet positief zijn");

        _bids[auctionId].push(Bid({
            auctionId: auctionId,
            bidderWallet: bidderWallet,
            amountEurocents: amountEurocents,
            financingCondition: financingCondition,
            blockNumber: block.number,
            timestamp: block.timestamp
        }));

        totalBids++;

        emit BidPlaced(
            auctionId,
            bidderWallet,
            amountEurocents,
            financingCondition,
            block.number,
            block.timestamp
        );
    }

    /**
     * @notice Lees alle biedingen voor een veiling (publiek, voor verificatie).
     */
    function getBids(uint256 auctionId) external view returns (Bid[] memory) {
        return _bids[auctionId];
    }

    /**
     * @notice Aantal biedingen voor een specifieke veiling.
     */
    function getBidCount(uint256 auctionId) external view returns (uint256) {
        return _bids[auctionId].length;
    }

    /**
     * @notice Verander de operator (bijv. bij key-rotatie).
     */
    function setOperator(address newOperator) external onlyOperator {
        require(newOperator != address(0), "OssoBidRegistry: ongeldig adres");
        emit OperatorChanged(operator, newOperator);
        operator = newOperator;
    }
}
