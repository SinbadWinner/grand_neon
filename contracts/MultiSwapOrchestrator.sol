// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./NFTRewardsContract.sol";
import "./RaydiumSwapContract.sol";

/// @title MultiSwapOrchestrator
/// @notice Главный контракт для выбора платформы свапа и выдачи NFT наград
/// @dev Поддерживает PancakeSwap и Raydium, автоматически выдает NFT за свапы
contract MultiSwapOrchestrator is ReentrancyGuard, Ownable {
    
    enum SwapPlatform {
        PANCAKESWAP,
        RAYDIUM
    }

    struct SwapParams {
        SwapPlatform platform;
        address tokenA;
        address tokenB;
        uint256 amountIn;
        uint256 amountOutMin;
        uint16 slippage; // в базисных пунктах (100 = 1%)
        bytes32 raydiumPoolId; // Только для Raydium
    }

    // Контракты
    NFTRewardsContract public immutable nftRewards;
    RaydiumSwapContract public immutable raydiumSwap;
    address public pancakeRouter;
    address public pancakeFactory;

    // События
    event SwapExecuted(
        address indexed user,
        SwapPlatform platform,
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint256 amountOut,
        uint256 pointsEarned
    );

    event PlatformConfigured(
        SwapPlatform platform,
        address contractAddress
    );

    event PoolCreated(
        SwapPlatform platform,
        address tokenA,
        address tokenB,
        bytes32 poolId
    );

    // Маппинги для отслеживания пулов
    mapping(bytes32 => bool) public raydiumPools; // poolId => exists
    mapping(bytes32 => bool) public pancakePools; // keccak256(tokenA, tokenB) => exists

    modifier validTokens(address tokenA, address tokenB) {
        require(tokenA != address(0) && tokenB != address(0), "Invalid tokens");
        require(tokenA != tokenB, "Same token");
        _;
    }

    constructor(
        address _nftRewards,
        address _raydiumSwap,
        address _pancakeRouter,
        address _pancakeFactory
    ) {
        nftRewards = NFTRewardsContract(_nftRewards);
        raydiumSwap = RaydiumSwapContract(_raydiumSwap);
        pancakeRouter = _pancakeRouter;
        pancakeFactory = _pancakeFactory;

        // Авторизуем этот контракт в NFT системе
        nftRewards.authorizeSwapContract(address(this), true);

        emit PlatformConfigured(SwapPlatform.PANCAKESWAP, _pancakeRouter);
        emit PlatformConfigured(SwapPlatform.RAYDIUM, _raydiumSwap);
    }

    /// @notice Выполняет свап на выбранной платформе с автоматической выдачей NFT
    /// @param params Параметры свапа
    /// @return amountOut Количество полученных токенов
    function executeSwap(SwapParams calldata params) 
        external 
        nonReentrant 
        validTokens(params.tokenA, params.tokenB)
        returns (uint256 amountOut) 
    {
        require(params.amountIn > 0, "Amount must be > 0");

        // Переводим токены от пользователя
        IERC20(params.tokenA).transferFrom(msg.sender, address(this), params.amountIn);

        if (params.platform == SwapPlatform.PANCAKESWAP) {
            amountOut = _executePancakeSwap(params);
        } else {
            amountOut = _executeRaydiumSwap(params);
        }

        // Переводим полученные токены пользователю
        IERC20(params.tokenB).transfer(msg.sender, amountOut);

        // Записываем активность и начисляем баллы
        nftRewards.recordSwapActivity(msg.sender, params.amountIn);
        
        // Получаем баллы для события
        uint256 pointsEarned = nftRewards.calculatePoints(params.amountIn);

        // Проверяем автоматические достижения
        _checkAndMintAchievements(msg.sender);

        emit SwapExecuted(
            msg.sender,
            params.platform,
            params.tokenA,
            params.tokenB,
            params.amountIn,
            amountOut,
            pointsEarned
        );

        return amountOut;
    }

    /// @notice Создает пул на PancakeSwap
    /// @param tokenA Первый токен
    /// @param tokenB Второй токен
    /// @param amountA Количество первого токена
    /// @param amountB Количество второго токена
    /// @return pair Адрес созданной пары
    function createPancakePool(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external onlyOwner validTokens(tokenA, tokenB) returns (address pair) {
        
        // Интерфейс PancakeSwap Factory
        IPancakeFactory factory = IPancakeFactory(pancakeFactory);
        
        // Создаем пару если не существует
        pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = factory.createPair(tokenA, tokenB);
        }

        // Добавляем ликвидность
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        
        IERC20(tokenA).approve(pancakeRouter, amountA);
        IERC20(tokenB).approve(pancakeRouter, amountB);

        IPancakeRouter(pancakeRouter).addLiquidity(
            tokenA,
            tokenB,
            amountA,
            amountB,
            (amountA * 95) / 100, // 5% slippage
            (amountB * 95) / 100,
            msg.sender,
            block.timestamp + 600
        );

        // Отмечаем пул как созданный
        bytes32 poolKey = keccak256(abi.encodePacked(tokenA, tokenB));
        pancakePools[poolKey] = true;

        emit PoolCreated(SwapPlatform.PANCAKESWAP, tokenA, tokenB, bytes32(uint256(uint160(pair))));
        return pair;
    }

    /// @notice Создает пул на Raydium
    /// @param tokenA Первый токен (SPL mint)
    /// @param tokenB Второй токен (SPL mint)
    /// @param amountA Количество первого токена
    /// @param amountB Количество второго токена
    /// @param configIndex Индекс конфигурации Raydium
    /// @return poolId ID созданного пула
    function createRaydiumPool(
        bytes32 tokenA,
        bytes32 tokenB,
        uint64 amountA,
        uint64 amountB,
        uint16 configIndex
    ) external payable onlyOwner returns (bytes32 poolId) {
        
        poolId = raydiumSwap.createPool{value: msg.value}(
            tokenA,
            tokenB,
            amountA,
            amountB,
            configIndex
        );

        raydiumPools[poolId] = true;

        emit PoolCreated(SwapPlatform.RAYDIUM, address(0), address(0), poolId);
        return poolId;
    }

    /// @notice Выполняет свап через PancakeSwap
    function _executePancakeSwap(SwapParams calldata params) internal returns (uint256 amountOut) {
        IERC20(params.tokenA).approve(pancakeRouter, params.amountIn);

        address[] memory path = new address[](2);
        path[0] = params.tokenA;
        path[1] = params.tokenB;

        uint256[] memory amounts = IPancakeRouter(pancakeRouter).swapExactTokensForTokens(
            params.amountIn,
            params.amountOutMin,
            path,
            address(this),
            block.timestamp + 600
        );

        return amounts[1];
    }

    /// @notice Выполняет свап через Raydium
    function _executeRaydiumSwap(SwapParams calldata params) internal returns (uint256 amountOut) {
        require(raydiumPools[params.raydiumPoolId], "Pool does not exist");

        // Преобразуем ERC20 адреса в SPL mint адреса
        bytes32 tokenAMint = _getTokenMint(params.tokenA);
        bytes32 tokenBMint = _getTokenMint(params.tokenB);

        raydiumSwap.swapTokens(
            params.raydiumPoolId,
            tokenAMint,
            tokenBMint,
            uint64(params.amountIn),
            uint64(params.amountOutMin),
            params.slippage
        );

        // В реальной реализации нужно получить фактический amountOut
        // Пока что возвращаем минимальное значение
        return params.amountOutMin;
    }

    /// @notice Проверяет и выдает автоматические достижения
    function _checkAndMintAchievements(address user) internal {
        NFTRewardsContract.UserStats memory stats = nftRewards.getUserStats(user);
        uint256 totalSwaps = stats.totalSwaps;
        uint256 totalPoints = stats.totalPoints;

        // Первый свап
        if (totalSwaps == 1) {
            nftRewards.mintAchievementNFT(user, "FIRST_SWAP");
        }
        
        // Активный трейдер (100+ свапов)
        else if (totalSwaps == 100) {
            nftRewards.mintAchievementNFT(user, "POWER_TRADER");
        }
        
        // Кит (накопил 500+ баллов)
        else if (totalPoints >= 500) {
            nftRewards.mintAchievementNFT(user, "WHALE");
        }
    }

    /// @notice Получает SPL mint для ERC20 токена
    function _getTokenMint(address token) internal view returns (bytes32) {
        // В реальной реализации нужно вызвать IERC20ForSpl(token).tokenMint()
        // Пока что заглушка
        return bytes32(uint256(uint160(token)));
    }

    /// @notice Обновляет адрес PancakeSwap роутера
    function updatePancakeRouter(address _newRouter) external onlyOwner {
        pancakeRouter = _newRouter;
        emit PlatformConfigured(SwapPlatform.PANCAKESWAP, _newRouter);
    }

    /// @notice Проверяет существование пула PancakeSwap
    function isPancakePoolExists(address tokenA, address tokenB) external view returns (bool) {
        bytes32 poolKey = keccak256(abi.encodePacked(tokenA, tokenB));
        return pancakePools[poolKey];
    }

    /// @notice Проверяет существование пула Raydium
    function isRaydiumPoolExists(bytes32 poolId) external view returns (bool) {
        return raydiumPools[poolId];
    }

    /// @notice Экстренное извлечение токенов (только владелец)
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}

// Интерфейсы для PancakeSwap
interface IPancakeFactory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IPancakeRouter {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
} 
