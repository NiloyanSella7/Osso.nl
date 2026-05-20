// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BidEscrow
 * @notice Vergrendelt het exacte bod-bedrag in USDC bij het plaatsen van een bieding.
 *         Fondsen worden automatisch vrijgegeven na afronding van de veiling:
 *         - Winnaar: fondsen worden doorgestort naar de verkoper
 *         - Verliezers: fondsen worden automatisch teruggestort
 *
 * Gebruik USDC (6 decimalen) als stablecoin om koersvolatiliteit te vermijden.
 */
contract BidEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    // Gecombineerde autorisatie: owner + AuctionManager
    mapping(address => bool) private _operators;

    // auctionId => bidder => vergrendeld bedrag in USDC (6 decimalen)
    mapping(uint256 => mapping(address => uint256)) private _lockedFunds;

    // auctionId => totaal vergrendeld bedrag
    mapping(uint256 => uint256) private _auctionTotal;

    event FundsLocked(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event FundsReleased(uint256 indexed auctionId, address indexed seller, uint256 amount);
    event FundsRefunded(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event OperatorAdded(address indexed operator);

    modifier onlyAuthorized() {
        require(msg.sender == owner() || _operators[msg.sender], "BidEscrow: niet geautoriseerd");
        _;
    }

    constructor(address initialOwner, address usdcAddress) Ownable(initialOwner) {
        usdc = IERC20(usdcAddress);
    }

    /**
     * @notice Vergrendelt het bod-bedrag in USDC.
     *         Wordt aangeroepen door AuctionManager na KYC-check.
     * @param auctionId Het ID van de veiling in AuctionManager
     * @param bidder Het wallet-adres van de bieder
     * @param amount Het bod-bedrag in USDC (6 decimalen)
     */
    function lockFunds(uint256 auctionId, address bidder, uint256 amount)
        external
        onlyAuthorized
        nonReentrant
    {
        require(amount > 0, "BidEscrow: bedrag moet positief zijn");
        require(bidder != address(0), "BidEscrow: ongeldig bidder-adres");

        // Terugstorten eventueel eerder bod van dezelfde bieder
        uint256 previous = _lockedFunds[auctionId][bidder];
        if (previous > 0) {
            _lockedFunds[auctionId][bidder] = 0;
            _auctionTotal[auctionId] -= previous;
            usdc.safeTransfer(bidder, previous);
            emit FundsRefunded(auctionId, bidder, previous);
        }

        usdc.safeTransferFrom(bidder, address(this), amount);
        _lockedFunds[auctionId][bidder] = amount;
        _auctionTotal[auctionId] += amount;

        emit FundsLocked(auctionId, bidder, amount);
    }

    /**
     * @notice Stort het winnende bod door naar de verkoper.
     *         Wordt aangeroepen door AuctionManager bij het sluiten van de veiling.
     */
    function releaseFunds(uint256 auctionId, address winner, address seller)
        external
        onlyAuthorized
        nonReentrant
    {
        uint256 amount = _lockedFunds[auctionId][winner];
        require(amount > 0, "BidEscrow: geen vergrendelde fondsen voor winnaar");

        _lockedFunds[auctionId][winner] = 0;
        _auctionTotal[auctionId] -= amount;
        usdc.safeTransfer(seller, amount);

        emit FundsReleased(auctionId, seller, amount);
    }

    /**
     * @notice Retourneert vergrendelde fondsen aan een verliezende bieder.
     *         Wordt in bulk aangeroepen door AuctionManager bij het sluiten.
     */
    function refund(uint256 auctionId, address bidder) external onlyAuthorized nonReentrant {
        uint256 amount = _lockedFunds[auctionId][bidder];
        if (amount == 0) return;

        _lockedFunds[auctionId][bidder] = 0;
        _auctionTotal[auctionId] -= amount;
        usdc.safeTransfer(bidder, amount);

        emit FundsRefunded(auctionId, bidder, amount);
    }

    /**
     * @notice Bulk-refund voor alle verliezende bieders. Gas-efficiënter dan losse aanroepen.
     */
    function refundAll(uint256 auctionId, address[] calldata losers)
        external
        onlyAuthorized
        nonReentrant
    {
        for (uint256 i = 0; i < losers.length; i++) {
            uint256 amount = _lockedFunds[auctionId][losers[i]];
            if (amount == 0) continue;
            _lockedFunds[auctionId][losers[i]] = 0;
            _auctionTotal[auctionId] -= amount;
            usdc.safeTransfer(losers[i], amount);
            emit FundsRefunded(auctionId, losers[i], amount);
        }
    }

    function getLockedAmount(uint256 auctionId, address bidder) external view returns (uint256) {
        return _lockedFunds[auctionId][bidder];
    }

    function getAuctionTotal(uint256 auctionId) external view returns (uint256) {
        return _auctionTotal[auctionId];
    }

    function addOperator(address operator) external onlyOwner {
        _operators[operator] = true;
        emit OperatorAdded(operator);
    }
}
