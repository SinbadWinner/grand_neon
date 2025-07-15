// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../neon-contracts/contracts/composability/libraries/raydium-cpmm-program/LibRaydiumCPMMProgram.sol";
import "../neon-contracts/contracts/composability/libraries/raydium-cpmm-program/LibRaydiumCPMMData.sol";
import "../neon-contracts/contracts/composability/libraries/raydium-cpmm-program/LibRaydiumCPMMErrors.sol";
import "../neon-contracts/contracts/utils/CallSolanaHelperLib.sol";
import "../neon-contracts/contracts/precompiles/ICallSolana.sol";
import "../neon-contracts/contracts/composability/libraries/Constants.sol";
import "../neon-contracts/contracts/composability/libraries/system-program/LibSystemData.sol";

/// @title RaydiumSwapContract
/// @notice Contract для выполнения свапов через Raydium CPMM на Solana
/// @dev Использует Neon EVM composability для вызова Raydium программ
contract RaydiumSwapContract {
    ICallSolana public constant CALL_SOLANA = ICallSolana(0xFF00000000000000000000000000000000000006);
    
    event SwapExecuted(
        address indexed user,
        bytes32 indexed poolId,
        bytes32 tokenA,
        bytes32 tokenB,
        uint64 amountIn,
        uint64 amountOut
    );

    event PoolCreated(
        bytes32 indexed poolId,
        bytes32 tokenA,
        bytes32 tokenB,
        uint64 amountA,
        uint64 amountB
    );

    error SwapFailed(string reason);
    error InsufficientBalance();
    error InvalidPool();

    /// @notice Выполняет свап токенов через Raydium CPMM
    /// @param poolId ID пула Raydium
    /// @param tokenA Адрес входящего токена
    /// @param tokenB Адрес исходящего токена
    /// @param amountIn Количество входящих токенов
    /// @param amountOutMin Минимальное количество исходящих токенов
    /// @param slippage Проскальзывание в базисных пунктах (100 = 1%)
    function swapTokens(
        bytes32 poolId,
        bytes32 tokenA,
        bytes32 tokenB,
        uint64 amountIn,
        uint64 amountOutMin,
        uint16 slippage
    ) external {
        // Проверяем, что пул существует
        if (LibSystemData.getSpace(poolId) == 0) {
            revert InvalidPool();
        }

        // Получаем данные пула
        LibRaydiumCPMMData.PoolData memory poolData = LibRaydiumCPMMData.getPoolData(poolId);
        
        // Проверяем, что токены соответствуют пулу
        require(
            (poolData.tokenA == tokenA && poolData.tokenB == tokenB) ||
            (poolData.tokenA == tokenB && poolData.tokenB == tokenA),
            "Token mismatch with pool"
        );

        bytes32[] memory premadeAccounts = new bytes32[](0);

        // Создаём инструкцию свапа
        (
            bytes32[] memory accounts,
            bool[] memory isSigner,
            bool[] memory isWritable,
            bytes memory data
        ) = LibRaydiumCPMMProgram.swapInputInstruction(
            poolId,
            tokenA,
            amountIn,
            slippage,
            true,
            premadeAccounts
        );

        // Выполняем свап через Solana
        CALL_SOLANA.execute(
            0, // не нужны дополнительные lamports для свапа
            CallSolanaHelperLib.prepareSolanaInstruction(
                Constants.getCreateCPMMPoolProgramId(),
                accounts,
                isSigner,
                isWritable,
                data
            )
        );

        // Получаем фактическое количество полученных токенов
        uint64 amountOut = calculateSwapOutput(poolId, tokenA, tokenB, amountIn);

        emit SwapExecuted(msg.sender, poolId, tokenA, tokenB, amountIn, amountOut);
    }

    /// @notice Создаёт новый пул ликвидности Raydium
    /// @param tokenA Первый токен пула
    /// @param tokenB Второй токен пула
    /// @param amountA Количество первого токена
    /// @param amountB Количество второго токена
    /// @param configIndex Индекс конфигурации Raydium
    function createPool(
        bytes32 tokenA,
        bytes32 tokenB,
        uint64 amountA,
        uint64 amountB,
        uint16 configIndex
    ) external payable returns (bytes32 poolId) {
        uint64 startTime = uint64(block.timestamp);
        bytes32[] memory premadeAccounts = new bytes32[](0);

        // Создаём инструкцию создания пула
        (
            uint64 lamports,
            bytes32[] memory accounts,
            bool[] memory isSigner,
            bool[] memory isWritable,
            bytes memory data
        ) = LibRaydiumCPMMProgram.createPoolInstruction(
            tokenA,
            tokenB,
            amountA,
            amountB,
            startTime,
            configIndex,
            true,
            premadeAccounts
        );

        // Проверяем, что отправлено достаточно lamports
        require(msg.value >= lamports, "Insufficient lamports for pool creation");

        // Выполняем создание пула
        CALL_SOLANA.execute(
            lamports,
            CallSolanaHelperLib.prepareSolanaInstruction(
                Constants.getCreateCPMMPoolProgramId(),
                accounts,
                isSigner,
                isWritable,
                data
            )
        );

        // Pool ID находится в accounts[3]
        poolId = accounts[3];

        emit PoolCreated(poolId, tokenA, tokenB, amountA, amountB);
        return poolId;
    }

    /// @notice Добавляет ликвидность в существующий пул
    /// @param poolId ID пула
    /// @param inputAmount Количество базового токена для добавления
    /// @param baseIn Использовать ли tokenA как базовый токен
    /// @param slippage Максимальное проскальзывание
    function addLiquidity(
        bytes32 poolId,
        uint64 inputAmount,
        bool baseIn,
        uint16 slippage
    ) external {
        bytes32[] memory premadeAccounts = new bytes32[](0);

        (
            bytes32[] memory accounts,
            bool[] memory isSigner,
            bool[] memory isWritable,
            bytes memory data
        ) = LibRaydiumCPMMProgram.addLiquidityInstruction(
            poolId,
            inputAmount,
            baseIn,
            slippage,
            true,
            premadeAccounts
        );

        CALL_SOLANA.execute(
            0,
            CallSolanaHelperLib.prepareSolanaInstruction(
                Constants.getCreateCPMMPoolProgramId(),
                accounts,
                isSigner,
                isWritable,
                data
            )
        );
    }

    /// @notice Получает информацию о пуле
    /// @param poolId ID пула
    /// @return poolData Данные пула
    function getPoolInfo(bytes32 poolId) external view returns (LibRaydiumCPMMData.PoolData memory poolData) {
        return LibRaydiumCPMMData.getPoolData(poolId);
    }

    /// @notice Рассчитывает ожидаемое количество токенов на выходе
    /// @param poolId ID пула
    /// @param tokenIn Входящий токен
    /// @param tokenOut Исходящий токен  
    /// @param amountIn Количество входящих токенов
    /// @return amountOut Ожидаемое количество исходящих токенов
    function calculateSwapOutput(
        bytes32 poolId,
        bytes32 tokenIn,
        bytes32 tokenOut,
        uint64 amountIn
    ) public view returns (uint64 amountOut) {
        LibRaydiumCPMMData.PoolData memory poolData = LibRaydiumCPMMData.getPoolData(poolId);

        // Библиотечная функция требует: poolId, configAccount, inputToken, outputToken, amountIn
        return LibRaydiumCPMMData.getSwapOutput(
            poolId,
            poolData.ammConfig,
            tokenIn,
            tokenOut,
            amountIn
        );
    }

    /// @notice Получает резервы токенов в пуле
    /// @param poolId ID пула
    /// @return reserveA Резерв токена A
    /// @return reserveB Резерв токена B
    function getPoolReserves(bytes32 poolId) external view returns (uint64 reserveA, uint64 reserveB) {
        LibRaydiumCPMMData.PoolData memory poolData = LibRaydiumCPMMData.getPoolData(poolId);
        reserveA = LibRaydiumCPMMData.getTokenReserve(poolId, poolData.tokenA);
        reserveB = LibRaydiumCPMMData.getTokenReserve(poolId, poolData.tokenB);
    }

    /// @notice Получает PDA пула по токенам
    /// @param configIndex Индекс конфигурации
    /// @param tokenA Первый токен
    /// @param tokenB Второй токен
    /// @return poolId Вычисленный ID пула
    function getPoolId(
        uint16 configIndex,
        bytes32 tokenA,
        bytes32 tokenB
    ) external view returns (bytes32 poolId) {
        bytes32 configAccount = LibRaydiumCPMMData.getConfigAccount(configIndex);
        return LibRaydiumCPMMData.getCpmmPdaPoolId(configAccount, tokenA, tokenB);
    }
} 