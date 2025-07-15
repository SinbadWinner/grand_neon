/**
 * Multi-Swap dApp Usage Examples
 * 
 * Этот файл содержит примеры использования Multi-Swap dApp
 * для разработчиков и интеграторов
 */

const { ethers } = require('hardhat');
const fs = require('fs');

// Загружаем конфигурацию
let dappConfig;
try {
  dappConfig = JSON.parse(fs.readFileSync('dapp-config.json', 'utf8'));
} catch (error) {
  console.log('❌ Run npm run deploy first!');
  process.exit(1);
}

// ABI для контрактов
const multiSwapABI = [
  "function executeSwap((uint8,address,address,uint256,uint256,uint16,bytes32)) external returns (uint256)",
  "function createPancakePool(address,address,uint256,uint256) external returns (address)",
  "function createRaydiumPool(bytes32,bytes32,uint64,uint64,uint16) external payable returns (bytes32)",
  "function isPancakePoolExists(address,address) external view returns (bool)",
  "function isRaydiumPoolExists(bytes32) external view returns (bool)"
];

const nftABI = [
  "function getUserStats(address) external view returns (uint256,uint256,uint256,uint256)",
  "function mintRewardNFT(uint256,string) external",
  "function getUserNFTs(address) external view returns (uint256[])",
  "function calculatePoints(uint256) external pure returns (uint256)"
];

const erc20ABI = [
  "function balanceOf(address) external view returns (uint256)",
  "function approve(address,uint256) external returns (bool)",
  "function transfer(address,uint256) external returns (bool)"
];

async function examples() {
  console.log('📚 === MULTI-SWAP DAPP USAGE EXAMPLES ===\n');

  const [signer] = await ethers.getSigners();
  
  // Инициализируем контракты
  const multiSwap = new ethers.Contract(dappConfig.contracts.multiSwapOrchestrator, multiSwapABI, signer);
  const nftRewards = new ethers.Contract(dappConfig.contracts.nftRewards, nftABI, signer);
  const usdcToken = new ethers.Contract(dappConfig.tokens.USDC.address, erc20ABI, signer);
  const solToken = new ethers.Contract(dappConfig.tokens.SOL.address, erc20ABI, signer);

  console.log('📋 Loaded contracts:');
  console.log(`   MultiSwap: ${dappConfig.contracts.multiSwapOrchestrator}`);
  console.log(`   NFT Rewards: ${dappConfig.contracts.nftRewards}`);
  console.log(`   USDC: ${dappConfig.tokens.USDC.address}`);
  console.log(`   SOL: ${dappConfig.tokens.SOL.address}\n`);

  // === ПРИМЕР 1: PancakeSwap Swap ===
  console.log('🥞 === EXAMPLE 1: PANCAKESWAP SWAP ===');
  
  console.log(`
// Подключение к контракту
const multiSwap = new ethers.Contract(
  "${dappConfig.contracts.multiSwapOrchestrator}",
  multiSwapABI,
  signer
);

// Параметры PancakeSwap свапа
const pancakeSwapParams = {
  platform: 0,                    // 0 = PancakeSwap
  tokenA: "${dappConfig.tokens.USDC.address}",
  tokenB: "${dappConfig.tokens.SOL.address}",
  amountIn: ethers.parseUnits('100', 6),     // 100 USDC
  amountOutMin: ethers.parseUnits('3', 9),   // минимум 3 SOL
  slippage: 300,                   // 3% slippage
  raydiumPoolId: ethers.ZeroHash   // не используется для PancakeSwap
};

// Аппрув токенов
await usdcToken.approve("${dappConfig.contracts.multiSwapOrchestrator}", pancakeSwapParams.amountIn);

// Выполнение свапа
const tx = await multiSwap.executeSwap(pancakeSwapParams);
await tx.wait();

console.log('✅ PancakeSwap swap completed!');
  `);

  // === ПРИМЕР 2: Raydium Swap ===
  console.log('⚡ === EXAMPLE 2: RAYDIUM SWAP ===');
  
  const raydiumPools = dappConfig.raydium.pools;
  const hasRaydiumPools = Object.keys(raydiumPools).length > 0;
  
  if (hasRaydiumPools) {
    const poolId = raydiumPools['usdc/sol'];
    console.log(`
// Параметры Raydium свапа
const raydiumSwapParams = {
  platform: 1,                    // 1 = Raydium
  tokenA: "${dappConfig.tokens.USDC.address}",
  tokenB: "${dappConfig.tokens.SOL.address}",
  amountIn: ethers.parseUnits('50', 6),      // 50 USDC
  amountOutMin: ethers.parseUnits('1', 9),   // минимум 1 SOL
  slippage: 500,                   // 5% slippage
  raydiumPoolId: "${poolId}"       // ID Raydium пула
};

// Аппрув токенов
await usdcToken.approve("${dappConfig.contracts.multiSwapOrchestrator}", raydiumSwapParams.amountIn);

// Выполнение свапа
const tx = await multiSwap.executeSwap(raydiumSwapParams);
await tx.wait();

console.log('✅ Raydium swap completed!');
    `);
  } else {
    console.log(`
// ⚠️ Raydium пулы не созданы в текущей конфигурации
// Для создания Raydium пула:

const poolId = await multiSwap.createRaydiumPool(
  "${dappConfig.tokens.USDC.address_spl}", // USDC SPL mint
  "${dappConfig.tokens.SOL.address_spl}",  // SOL SPL mint
  ethers.parseUnits('1000', 6),  // 1000 USDC
  ethers.parseUnits('30', 9),    // 30 SOL
  0,                             // config index
  { value: ethers.parseEther('0.1') } // lamports для создания
);
    `);
  }

  // === ПРИМЕР 3: NFT Rewards ===
  console.log('\n🎁 === EXAMPLE 3: NFT REWARDS ===');
  
  console.log(`
// Проверка статистики пользователя
const nftContract = new ethers.Contract(
  "${dappConfig.contracts.nftRewards}",
  nftABI,
  signer
);

const [totalSwaps, totalPoints, totalNFTs, lastActivity] = 
  await nftContract.getUserStats(userAddress);

console.log('User stats:', {
  swaps: totalSwaps.toString(),
  points: totalPoints.toString(),
  nfts: totalNFTs.toString()
});

// Расчет баллов за свап
const swapAmount = ethers.parseUnits('100', 6); // 100 USDC
const points = await nftContract.calculatePoints(swapAmount);
console.log('Points for swap:', points.toString());

// Минт NFT за накопленные баллы
if (totalPoints >= 10n) {
  const mintTx = await nftContract.mintRewardNFT(10, "My Achievement");
  await mintTx.wait();
  console.log('✅ NFT minted!');
}

// Проверка NFT пользователя
const userNFTs = await nftContract.getUserNFTs(userAddress);
console.log('User NFTs:', userNFTs.map(id => id.toString()));
  `);

  // === ПРИМЕР 4: Проверка пулов ===
  console.log('\n🌊 === EXAMPLE 4: POOL MANAGEMENT ===');
  
  console.log(`
// Проверка существования PancakeSwap пула
const pancakePoolExists = await multiSwap.isPancakePoolExists(
  "${dappConfig.tokens.USDC.address}",
  "${dappConfig.tokens.SOL.address}"
);
console.log('PancakeSwap USDC/SOL pool exists:', pancakePoolExists);
  `);

  if (hasRaydiumPools) {
    const poolId = raydiumPools['usdc/sol'];
    console.log(`
// Проверка существования Raydium пула
const raydiumPoolExists = await multiSwap.isRaydiumPoolExists("${poolId}");
console.log('Raydium USDC/SOL pool exists:', raydiumPoolExists);
    `);
  }

  // === ПРИМЕР 5: Сравнение платформ ===
  console.log('\n⚖️ === EXAMPLE 5: PLATFORM COMPARISON ===');
  
  console.log(`
// Функция для получения лучшей цены
async function getBestSwapPrice(tokenA, tokenB, amountIn) {
  // Получаем котировку от PancakeSwap
  const pancakeRouter = new ethers.Contract(
    "${dappConfig.pancakeswap.router}",
    ["function getAmountsOut(uint256,address[]) external view returns (uint256[])"],
    signer
  );
  
  const pancakePath = [tokenA, tokenB];
  const pancakeAmounts = await pancakeRouter.getAmountsOut(amountIn, pancakePath);
  const pancakeOutput = pancakeAmounts[1];
  
  // Для Raydium нужно вызвать специальную функцию котировки
  // (в данном примере упрощено)
  
  console.log('PancakeSwap output:', ethers.formatUnits(pancakeOutput, 9));
  
  // Выбираем лучшую платформу
  const usePancakeSwap = true; // В реальности сравниваем цены
  
  return {
    platform: usePancakeSwap ? 0 : 1,
    expectedOutput: pancakeOutput,
    router: usePancakeSwap ? 'PancakeSwap' : 'Raydium'
  };
}

// Использование
const bestPrice = await getBestSwapPrice(
  "${dappConfig.tokens.USDC.address}",
  "${dappConfig.tokens.SOL.address}",
  ethers.parseUnits('100', 6)
);

console.log('Best platform:', bestPrice.router);
  `);

  // === ПРИМЕР 6: Batch операции ===
  console.log('\n🔄 === EXAMPLE 6: BATCH OPERATIONS ===');
  
  console.log(`
// Выполнение множественных свапов для накопления баллов
async function performMultipleSwaps(count) {
  for (let i = 0; i < count; i++) {
    const swapParams = {
      platform: i % 2, // Чередуем платформы
      tokenA: "${dappConfig.tokens.USDC.address}",
      tokenB: "${dappConfig.tokens.SOL.address}",
      amountIn: ethers.parseUnits('10', 6), // 10 USDC каждый
      amountOutMin: ethers.parseUnits('0.3', 9), // минимум 0.3 SOL
      slippage: 500,
      raydiumPoolId: "${hasRaydiumPools ? raydiumPools['usdc/sol'] : 'ethers.ZeroHash'}"
    };
    
    // Аппрув токенов
    await usdcToken.approve("${dappConfig.contracts.multiSwapOrchestrator}", swapParams.amountIn);
    
    // Выполнение свапа
    const tx = await multiSwap.executeSwap(swapParams);
    await tx.wait();
    
    console.log(\`Swap \${i+1}/\${count} completed\`);
    
    // Небольшая пауза между свапами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Выполнить 5 свапов для накопления баллов
await performMultipleSwaps(5);

// Проверить накопленные баллы
const [, totalPoints] = await nftContract.getUserStats(signer.address);
console.log('Total points accumulated:', totalPoints.toString());
  `);

  // === ФИНАЛЬНЫЕ СОВЕТЫ ===
  console.log('\n💡 === INTEGRATION TIPS ===');
  
  console.log(`
### Советы по интеграции:

1. **Gas оптимизация**:
   - Группируйте approve и swap в одну транзакцию
   - Используйте estimateGas для расчета лимитов

2. **Error handling**:
   - Проверяйте существование пулов перед свапом
   - Обрабатывайте slippage errors
   - Используйте try/catch для graceful degradation

3. **User Experience**:
   - Показывайте накопленные баллы в реальном времени
   - Предупреждайте о доступных достижениях
   - Отображайте историю NFT

4. **Monitoring**:
   - Слушайте события SwapExecuted и NFTMinted
   - Трекайте статистику пользователей
   - Мониторьте health пулов

### Полезные события:
- multiSwap.on('SwapExecuted', (user, platform, tokenA, tokenB, amountIn, amountOut, points) => {})
- nftContract.on('NFTMinted', (user, tokenId, rarity, points, description) => {})
- nftContract.on('SwapRecorded', (user, points, totalPoints) => {})
  `);

  console.log('\n🎉 === EXAMPLES COMPLETED ===');
  console.log('\n📚 See README.md for full documentation');
  console.log('🧪 Run: npm run test:swap for live testing');
}

// Экспорт для использования в других файлах
module.exports = {
  dappConfig,
  multiSwapABI,
  nftABI,
  erc20ABI
};

// Запуск примеров если файл вызван напрямую
if (require.main === module) {
  examples()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Examples failed:', error);
      process.exit(1);
    });
} 