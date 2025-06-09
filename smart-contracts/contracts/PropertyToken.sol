pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract PropertyToken is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    struct Property {
        string ipfsHash; // IPFS hash for property documents
        uint256 totalValue; // Total value in INR
        uint256 totalTokens; // Total number of tokens
        uint256 tokensSold; // Number of tokens sold
        address developer; // Developer address
        bool isActive; // Whether the property is active for trading
    }

    mapping(uint256 => Property) public properties;
    mapping(uint256 => mapping(address => uint256)) public tokenBalances;

    event PropertyTokenized(uint256 tokenId, string ipfsHash, uint256 totalValue, uint256 totalTokens, address developer);
    event TokensPurchased(uint256 tokenId, address buyer, uint256 amount);
    event TokensSold(uint256 tokenId, address seller, uint256 amount);

    constructor() ERC721("PropertyToken", "PROP") {}

    function tokenizeProperty(
        string memory ipfsHash,
        uint256 totalValue,
        uint256 totalTokens
    ) external onlyOwner returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        properties[newTokenId] = Property({
            ipfsHash: ipfsHash,
            totalValue: totalValue,
            totalTokens: totalTokens,
            tokensSold: 0,
            developer: msg.sender,
            isActive: true
        });

        _mint(msg.sender, newTokenId);

        emit PropertyTokenized(newTokenId, ipfsHash, totalValue, totalTokens, msg.sender);
        return newTokenId;
    }

    function purchaseTokens(uint256 tokenId, uint256 amount) external payable {
        Property storage property = properties[tokenId];
        require(property.isActive, "Property is not active");
        require(property.tokensSold + amount <= property.totalTokens, "Not enough tokens available");

        uint256 tokenPrice = (property.totalValue * amount) / property.totalTokens;
        require(msg.value >= tokenPrice, "Insufficient payment");

        property.tokensSold += amount;
        tokenBalances[tokenId][msg.sender] += amount;

        payable(property.developer).transfer(msg.value);

        emit TokensPurchased(tokenId, msg.sender, amount);
    }

    function sellTokens(uint256 tokenId, uint256 amount) external {
        Property storage property = properties[tokenId];
        require(property.isActive, "Property is not active");
        require(tokenBalances[tokenId][msg.sender] >= amount, "Insufficient token balance");

        tokenBalances[tokenId][msg.sender] -= amount;
        property.tokensSold -= amount;

        uint256 tokenPrice = (property.totalValue * amount) / property.totalTokens;
        payable(msg.sender).transfer(tokenPrice);

        emit TokensSold(tokenId, msg.sender, amount);
    }

    function deactivateProperty(uint256 tokenId) external onlyOwner {
        properties[tokenId].isActive = false;
    }
}