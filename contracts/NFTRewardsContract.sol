// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "@openzeppelin/contracts/utils/Strings.sol";

/// @title NFTRewardsContract
/// @notice Контракт для выдачи NFT наград за активность в свапах
/// @dev ERC721 токены с метаданными и системой редкости
contract NFTRewardsContract is ERC721, Ownable {
    
    using Strings for uint256;

    uint256 private _tokenIdTracker;

    // Типы редкости NFT
    enum Rarity {
        COMMON,    // 10+ баллов или $1000+ объем
        RARE,      // 20+ баллов или $5000+ объем
        EPIC,      // 30+ баллов или $10000+ объем  
        LEGENDARY  // 50+ баллов
    }

    // Структура NFT
    struct RewardNFT {
        Rarity rarity;
        uint256 points;
        uint256 mintTimestamp;
        string description;
    }

    // Структура пользователя
    struct UserStats {
        uint256 totalSwaps;
        uint256 totalPoints;
        uint256 totalNFTs;
        uint256 lastActivityTimestamp;
        uint256 totalTradingVolumeUSD; // НОВОЕ: общий объем торгов в долларах
        bool volumeNFT1000Claimed;     // НОВОЕ: получена ли NFT за $1000
        bool volumeNFT5000Claimed;     // НОВОЕ: получена ли NFT за $5000
        bool volumeNFT10000Claimed;    // НОВОЕ: получена ли NFT за $10000
    }

    // Маппинги
    mapping(uint256 => RewardNFT) public rewardNFTs;
    mapping(address => UserStats) public userStats;
    mapping(address => uint256[]) public userTokens;
    mapping(Rarity => uint256) public rarityCount;

    // Авторизованные контракты свапа
    mapping(address => bool) public authorizedSwapContracts;

    // События
    event NFTMinted(
        address indexed user,
        uint256 indexed tokenId,
        Rarity rarity,
        uint256 points,
        string description
    );

    event SwapRecorded(
        address indexed user,
        uint256 points,
        uint256 totalPoints
    );

    event SwapContractAuthorized(address indexed swapContract, bool authorized);

    // НОВОЕ: Событие для объемных наград
    event VolumeNFTMinted(
        address indexed user,
        uint256 indexed tokenId,
        Rarity rarity,
        uint256 volumeUSD,
        string description
    );

    // Модификаторы
    modifier onlyAuthorizedSwap() {
        require(authorizedSwapContracts[msg.sender], "Not authorized swap contract");
        _;
    }

    constructor() ERC721("SwapRewards", "SWAPR") {}

    /// @notice Авторизует контракт свапа для записи активности
    /// @param swapContract Адрес контракта свапа
    /// @param authorized Статус авторизации
    function authorizeSwapContract(address swapContract, bool authorized) external onlyOwner {
        authorizedSwapContracts[swapContract] = authorized;
        emit SwapContractAuthorized(swapContract, authorized);
    }

    /// @notice Записывает активность свапа пользователя
    /// @param user Адрес пользователя
    /// @param swapAmount Объём свапа
    function recordSwapActivity(address user, uint256 swapAmount) external onlyAuthorizedSwap {
        uint256 points = calculatePoints(swapAmount);
        
        UserStats storage stats = userStats[user];
        stats.totalSwaps++;
        stats.totalPoints += points;
        stats.lastActivityTimestamp = block.timestamp;
        
        // НОВОЕ: Добавляем объем в доллары (предполагаем что swapAmount уже в долларах * 1e18)
        uint256 volumeUSD = swapAmount / 1e18;
        stats.totalTradingVolumeUSD += volumeUSD;

        emit SwapRecorded(user, points, stats.totalPoints);
        
        // НОВОЕ: Проверяем и выдаем NFT по объему торгов
        _checkAndMintVolumeNFTs(user);
    }

    /// @notice НОВАЯ ФУНКЦИЯ: Проверяет и выдает NFT за объем торгов
    /// @param user Адрес пользователя
    function _checkAndMintVolumeNFTs(address user) internal {
        UserStats storage stats = userStats[user];
        
        // Проверяем NFT за $10,000
        if (stats.totalTradingVolumeUSD >= 10000 && !stats.volumeNFT10000Claimed) {
            _mintVolumeNFT(user, Rarity.EPIC, 10000, "Elite Trader - $10,000 Volume");
            stats.volumeNFT10000Claimed = true;
        }
        // Проверяем NFT за $5,000
        else if (stats.totalTradingVolumeUSD >= 5000 && !stats.volumeNFT5000Claimed) {
            _mintVolumeNFT(user, Rarity.RARE, 5000, "Advanced Trader - $5,000 Volume");
            stats.volumeNFT5000Claimed = true;
        }
        // Проверяем NFT за $1,000
        else if (stats.totalTradingVolumeUSD >= 1000 && !stats.volumeNFT1000Claimed) {
            _mintVolumeNFT(user, Rarity.COMMON, 1000, "Active Trader - $1,000 Volume");
            stats.volumeNFT1000Claimed = true;
        }
    }

    /// @notice НОВАЯ ФУНКЦИЯ: Минтит NFT за объем торгов
    /// @param user Пользователь
    /// @param rarity Редкость NFT
    /// @param volumeUSD Объем торгов в долларах
    /// @param description Описание достижения
    function _mintVolumeNFT(address user, Rarity rarity, uint256 volumeUSD, string memory description) internal {
        ++_tokenIdTracker;
        uint256 tokenId = _tokenIdTracker;

        // Создаём NFT
        rewardNFTs[tokenId] = RewardNFT({
            rarity: rarity,
            points: 0, // Для объемных NFT баллы не используются
            mintTimestamp: block.timestamp,
            description: description
        });

        // Обновляем статистику
        userStats[user].totalNFTs++;
        userTokens[user].push(tokenId);
        rarityCount[rarity]++;

        // Минтим NFT
        _safeMint(user, tokenId);

        emit VolumeNFTMinted(user, tokenId, rarity, volumeUSD, description);
    }

    /// @notice НОВАЯ ФУНКЦИЯ: Получает статистику объема торгов пользователя
    /// @param user Адрес пользователя
    /// @return volume Общий объем торгов в долларах
    /// @return nft1000 Получена ли NFT за $1000
    /// @return nft5000 Получена ли NFT за $5000
    /// @return nft10000 Получена ли NFT за $10000
    function getUserVolumeStats(address user) external view returns (
        uint256 volume,
        bool nft1000,
        bool nft5000,
        bool nft10000
    ) {
        UserStats memory stats = userStats[user];
        return (
            stats.totalTradingVolumeUSD,
            stats.volumeNFT1000Claimed,
            stats.volumeNFT5000Claimed,
            stats.volumeNFT10000Claimed
        );
    }

    /// @notice Минтит NFT награду пользователю
    /// @param points Количество баллов для минта
    /// @param description Описание достижения
    function mintRewardNFT(uint256 points, string memory description) external {
        require(points > 0, "Points must be greater than 0");
        require(userStats[msg.sender].totalPoints >= points, "Insufficient points");

        // Определяем редкость
        Rarity rarity = getRarityFromPoints(points);
        
        // Увеличиваем счётчик токенов
        ++_tokenIdTracker;
        uint256 tokenId = _tokenIdTracker;

        // Создаём NFT
        rewardNFTs[tokenId] = RewardNFT({
            rarity: rarity,
            points: points,
            mintTimestamp: block.timestamp,
            description: description
        });

        // Обновляем статистику пользователя
        userStats[msg.sender].totalNFTs++;
        userTokens[msg.sender].push(tokenId);
        rarityCount[rarity]++;

        // Списываем баллы
        userStats[msg.sender].totalPoints -= points;

        // Минтим NFT
        _safeMint(msg.sender, tokenId);

        emit NFTMinted(msg.sender, tokenId, rarity, points, description);
    }

    /// @notice Автоматический минт NFT за достижения
    /// @param user Пользователь
    /// @param achievementType Тип достижения
    function mintAchievementNFT(address user, string memory achievementType) external onlyAuthorizedSwap {
        UserStats memory stats = userStats[user];
        
        string memory description;
        uint256 requiredPoints;
        
        // Определяем тип достижения
        if (keccak256(bytes(achievementType)) == keccak256(bytes("FIRST_SWAP"))) {
            description = "First Swap Achievement";
            requiredPoints = 10;
        } else if (keccak256(bytes(achievementType)) == keccak256(bytes("POWER_TRADER"))) {
            description = "Power Trader - 100+ Swaps";
            requiredPoints = 50;
            require(stats.totalSwaps >= 100, "Not enough swaps");
        } else if (keccak256(bytes(achievementType)) == keccak256(bytes("WHALE"))) {
            description = "Whale - High Volume Trader";
            requiredPoints = 100;
            require(stats.totalPoints >= 500, "Not enough total points");
        } else {
            revert("Unknown achievement type");
        }

        if (stats.totalPoints >= requiredPoints) {
            // Создаём NFT автоматически
            ++_tokenIdTracker;
            uint256 tokenId = _tokenIdTracker;

            Rarity rarity = getRarityFromPoints(requiredPoints);
            
            rewardNFTs[tokenId] = RewardNFT({
                rarity: rarity,
                points: requiredPoints,
                mintTimestamp: block.timestamp,
                description: description
            });

            userStats[user].totalNFTs++;
            userTokens[user].push(tokenId);
            rarityCount[rarity]++;
            userStats[user].totalPoints -= requiredPoints;

            _safeMint(user, tokenId);

            emit NFTMinted(user, tokenId, rarity, requiredPoints, description);
        }
    }

    /// @notice Рассчитывает баллы за свап
    /// @param swapAmount Объём свапа
    /// @return points Количество баллов
    function calculatePoints(uint256 swapAmount) public pure returns (uint256 points) {
        if (swapAmount >= 1000 * 1e18) return 50;      // $1000+
        if (swapAmount >= 500 * 1e18) return 30;       // $500+
        if (swapAmount >= 100 * 1e18) return 20;       // $100+
        if (swapAmount >= 10 * 1e18) return 10;        // $10+
        return 5; // Минимум 5 баллов за любой свап
    }

    /// @notice Определяет редкость по баллам
    /// @param points Количество баллов
    /// @return rarity Редкость NFT
    function getRarityFromPoints(uint256 points) public pure returns (Rarity rarity) {
        if (points >= 50) return Rarity.LEGENDARY;
        if (points >= 30) return Rarity.EPIC;
        if (points >= 20) return Rarity.RARE;
        return Rarity.COMMON;
    }

    /// @notice Получает статистику пользователя
    /// @param user Адрес пользователя
    /// @return stats Статистика пользователя
    function getUserStats(address user) external view returns (UserStats memory stats) {
        return userStats[user];
    }

    /// @notice Получает NFT пользователя
    /// @param user Адрес пользователя
    /// @return tokenIds Массив ID токенов
    function getUserNFTs(address user) external view returns (uint256[] memory tokenIds) {
        return userTokens[user];
    }

    /// @notice Получает информацию о NFT
    /// @param tokenId ID токена
    /// @return nft Информация о NFT
    function getNFTInfo(uint256 tokenId) external view returns (RewardNFT memory nft) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return rewardNFTs[tokenId];
    }

    /// @notice Получает общую статистику
    /// @return totalMinted Всего минчено NFT
    /// @return commonCount Количество обычных NFT
    /// @return rareCount Количество редких NFT
    /// @return epicCount Количество эпических NFT
    /// @return legendaryCount Количество легендарных NFT
    function getGlobalStats() external view returns (
        uint256 totalMinted,
        uint256 commonCount,
        uint256 rareCount,
        uint256 epicCount,
        uint256 legendaryCount
    ) {
        totalMinted = _tokenIdTracker;
        commonCount = rarityCount[Rarity.COMMON];
        rareCount = rarityCount[Rarity.RARE];
        epicCount = rarityCount[Rarity.EPIC];
        legendaryCount = rarityCount[Rarity.LEGENDARY];
    }

    /// @notice Возвращает URI метаданных токена
    /// @param tokenId ID токена
    /// @return URI метаданных
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        RewardNFT memory nft = rewardNFTs[tokenId];
        
        string memory rarityStr = getRarityString(nft.rarity);
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "SwapRewards #',
                        tokenId.toString(),
                        '", "description": "',
                        nft.description,
                        '", "attributes": [{"trait_type": "Rarity", "value": "',
                        rarityStr,
                        '"}, {"trait_type": "Points", "value": "',
                        nft.points.toString(),
                        '"}, {"trait_type": "Mint Date", "value": "',
                        nft.mintTimestamp.toString(),
                        '"}]}'
                    )
                )
            )
        );
        
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /// @notice Получает строковое представление редкости
    /// @param rarity Редкость NFT
    /// @return rarityStr Строковое представление
    function getRarityString(Rarity rarity) internal pure returns (string memory rarityStr) {
        if (rarity == Rarity.COMMON) return "Common";
        if (rarity == Rarity.RARE) return "Rare";
        if (rarity == Rarity.EPIC) return "Epic";
        if (rarity == Rarity.LEGENDARY) return "Legendary";
        return "Unknown";
    }
}

// Base64 библиотека для кодирования JSON метаданных
library Base64 {
    string internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        string memory table = TABLE;
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);

        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            
            for { let i := 0 } lt(i, mload(data)) { i := add(i, 3) } {
                let input := add(add(data, 0x20), i)
                let out := mload(add(tablePtr, and(shr(18, mload(input)), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(12, mload(input)), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(6, mload(input)), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(mload(input), 0x3F))), 0xFF))
                out := shl(224, out)
                
                mstore(resultPtr, out)
                resultPtr := add(resultPtr, 4)
            }
            
            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
            
            mstore(result, encodedLen)
        }
        
        return result;
    }
} 
