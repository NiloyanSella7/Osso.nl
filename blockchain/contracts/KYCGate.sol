// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title KYCGate
 * @notice Beheert de whitelist van iDIN-geverifieerde wallet-adressen.
 *         Alleen wallet-adressen op de whitelist mogen bieden via AuctionManager.
 *         Persoonsgegevens worden NIET on-chain opgeslagen — uitsluitend het wallet-adres
 *         en een optionele SHA-256 hash van de iDIN-identifier.
 *
 * AVG-noot: De hash bewijst dat verificatie heeft plaatsgevonden zonder leesbare
 * persoonsgegevens bloot te stellen. Wanneer een gebruiker zijn recht op verwijdering
 * uitoefent, verwijdert de backend het off-chain profiel en roept removeFromWhitelist aan.
 */
contract KYCGate is Ownable {
    // wallet-adres => is geverifieerd
    mapping(address => bool) private _whitelist;

    // wallet-adres => SHA-256 hash van iDIN-identifier (optioneel)
    mapping(address => bytes32) private _idinHashes;

    // Gecombineerde autorisatie: owner (backend) + extra operators
    mapping(address => bool) private _operators;

    event AddedToWhitelist(address indexed wallet);
    event RemovedFromWhitelist(address indexed wallet);
    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);

    modifier onlyAuthorized() {
        require(msg.sender == owner() || _operators[msg.sender], "KYCGate: niet geautoriseerd");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Voegt een geverifieerd wallet-adres toe aan de whitelist.
     *         Wordt aangeroepen door de backend na succesvolle iDIN-verificatie.
     * @param wallet Het wallet-adres van de bieder
     * @param idinHash SHA-256 hash van de iDIN-identifier (bytes32, kan 0x00...00 zijn)
     */
    function addToWhitelist(address wallet, bytes32 idinHash) external onlyAuthorized {
        require(wallet != address(0), "KYCGate: ongeldig adres");
        _whitelist[wallet] = true;
        if (idinHash != bytes32(0)) {
            _idinHashes[wallet] = idinHash;
        }
        emit AddedToWhitelist(wallet);
    }

    /**
     * @notice Overload zonder idinHash voor eenvoudige whitelisting.
     */
    function addToWhitelist(address wallet) external onlyAuthorized {
        require(wallet != address(0), "KYCGate: ongeldig adres");
        _whitelist[wallet] = true;
        emit AddedToWhitelist(wallet);
    }

    /**
     * @notice Verwijdert een wallet-adres van de whitelist (AVG verwijderingsrecht).
     */
    function removeFromWhitelist(address wallet) external onlyAuthorized {
        _whitelist[wallet] = false;
        delete _idinHashes[wallet];
        emit RemovedFromWhitelist(wallet);
    }

    /**
     * @notice Controleert of een wallet-adres op de whitelist staat.
     * @return true als het adres geverifieerd is
     */
    function isWhitelisted(address wallet) external view returns (bool) {
        return _whitelist[wallet];
    }

    /**
     * @notice Retourneert de iDIN-hash voor een wallet-adres.
     */
    function getIdinHash(address wallet) external view returns (bytes32) {
        return _idinHashes[wallet];
    }

    function addOperator(address operator) external onlyOwner {
        _operators[operator] = true;
        emit OperatorAdded(operator);
    }

    function removeOperator(address operator) external onlyOwner {
        _operators[operator] = false;
        emit OperatorRemoved(operator);
    }
}
