const { ethers, network } = require('hardhat');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
require('dotenv').config();

// Загружаем конфигурацию
let dappConfig;
let configExists = false;

try {
  dappConfig = require('./dapp-config.js').dappConfig;
  configExists = true;
  console.log('📋 Configuration loaded successfully');
} catch (error) {
  console.log('⚠️  dapp-config.js not found. Testing environment only.\n');
  console.log('To test full deployment, run: npm run deploy first\n');
  configExists = false;
}

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function testEnvironment() {
  console.log('🌐 === TESTING ENVIRONMENT SETUP ===\n');
  
  const [deployer] = await ethers.getSigners();
  console.log(`🔗 Network: ${network.name}`);
  console.log(`👤 Deployer: ${deployer.address}\n`);

  let passed = 0;
  let failed = 0;

  // === ТЕСТ 1: Проверка сетевых подключений ===
  console.log('🌐 Test 1: Network Connections');
  try {
    // EVM
    const networkInfo = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`   ✓ Neon EVM: Chain ${networkInfo.chainId}, Block ${blockNumber}`);
    
    // Solana
    const version = await connection.getVersion();
    console.log(`   ✓ Solana Devnet: ${version['solana-core']}`);
    
    passed++;
  } catch (error) {
    console.log(`   ❌ Network connection failed: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 2: Проверка кошелька ===
  console.log('\n💰 Test 2: Wallet Status');
  try {
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`   ✓ Address: ${deployer.address}`);
    console.log(`   ✓ Balance: ${ethers.formatEther(balance)} NEON`);
    
    if (balance > ethers.parseEther('0.1')) {
      console.log(`   ✅ Sufficient funds for deployment`);
    } else {
      console.log(`   ⚠️  Low balance, may need more NEON`);
    }
    passed++;
  } catch (error) {
    console.log(`   ❌ Wallet check failed: ${error.message}`);
    failed++;
  }

  if (!configExists) {
    console.log('\n📋 === DEPLOYMENT NOT FOUND ===');
    console.log('   ℹ️  To test deployed contracts, run:');
    console.log('   1. npm run deploy');
    console.log('   2. npm run test');
    console.log('\n🎯 === ENVIRONMENT TEST RESULTS ===');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${Math.round(passed/(passed+failed)*100)}%\n`);
    
    if (failed === 0) {
      console.log('🎉 ENVIRONMENT READY FOR DEPLOYMENT!');
    }
    return { passed, failed };
  }

  return testDeployment();
}

async function testDeployment() {
  console.log('🧪 === TESTING MULTI-SWAP DAPP DEPLOYMENT ===\n');
  
  const [deployer] = await ethers.getSigners();
  console.log(`🔗 Network: ${network.name}`);
  console.log(`👤 Deployer: ${deployer.address}\n`);

  let passed = 0;
  let failed = 0;

  // === ТЕСТ 1: Проверка конфигурации ===
  console.log('📋 Test 1: Configuration Check');
  try {
    console.log(`   ✓ PancakeSwap Factory: ${dappConfig.pancakeswap.factory}`);
    console.log(`   ✓ PancakeSwap Router: ${dappConfig.pancakeswap.router}`);
    console.log(`   ✓ Raydium Contract: ${dappConfig.raydium.swapContract}`);
    console.log(`   ✓ NFT Contract: ${dappConfig.nft.rewardsContract}`);
    console.log(`   ✓ Tokens configured: ${Object.keys(dappConfig.tokens).length}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ Configuration error: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 2: Проверка PancakeSwap контрактов ===
  console.log('\n🥞 Test 2: PancakeSwap Contracts');
  try {
    // Проверяем Factory
    const factoryABI = [
      "function allPairsLength() external view returns (uint)",
      "function getPair(address tokenA, address tokenB) external view returns (address pair)"
    ];
    const factory = new ethers.Contract(dappConfig.pancakeswap.factory, factoryABI, deployer);
    const pairsCount = await factory.allPairsLength();
    console.log(`   ✓ Factory deployed: ${pairsCount} pairs created`);

    // Проверяем Router
    const routerABI = [
      "function factory() external view returns (address)",
      "function WETH() external view returns (address)"
    ];
    const router = new ethers.Contract(dappConfig.pancakeswap.router, routerABI, deployer);
    const factoryFromRouter = await router.factory();
    console.log(`   ✓ Router deployed: factory=${factoryFromRouter}`);
    
    passed++;
  } catch (error) {
    console.log(`   ❌ PancakeSwap test failed: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 3: Проверка токенов ===
  console.log('\n🪙 Test 3: Token Contracts');
  try {
    const tokenABI = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)"
    ];

    for (const [symbol, tokenInfo] of Object.entries(dappConfig.tokens)) {
      if (symbol === 'WNEON') continue;
      
      const token = new ethers.Contract(tokenInfo.address, tokenABI, deployer);
      const name = await token.name();
      const tokenSymbol = await token.symbol();
      const decimals = await token.decimals();
      
      console.log(`   ✓ ${symbol}: ${name} (${tokenSymbol}) - ${decimals} decimals`);
    }
    passed++;
  } catch (error) {
    console.log(`   ❌ Token test failed: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 4: Проверка пулов ликвидности ===
  console.log('\n🌊 Test 4: Liquidity Pools');
  try {
    const pairABI = [
      "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
      "function token0() external view returns (address)",
      "function token1() external view returns (address)"
    ];

    for (const [pairName, pairAddress] of Object.entries(dappConfig.pancakeswap.pools)) {
      if (pairName.includes('/')) continue; // Избегаем дубликатов
      
      const pair = new ethers.Contract(pairAddress, pairABI, deployer);
      const [reserve0, reserve1] = await pair.getReserves();
      
      console.log(`   ✓ ${pairName}: ${ethers.formatEther(reserve0)} / ${ethers.formatEther(reserve1)}`);
    }
    passed++;
  } catch (error) {
    console.log(`   ❌ Liquidity pools test failed: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 5: Проверка Raydium контракта ===
  console.log('\n⚡ Test 5: Raydium Integration');
  try {
    const raydiumABI = [
      "function calculateSwapOutput(bytes32 poolId, bytes32 tokenIn, bytes32 tokenOut, uint64 amountIn) view returns (uint64)"
    ];
    
    const raydiumContract = new ethers.Contract(
      dappConfig.raydium.swapContract,
      raydiumABI,
      deployer
    );

    // Проверяем, что контракт отвечает
    const code = await ethers.provider.getCode(dappConfig.raydium.swapContract);
    if (code === '0x') {
      throw new Error('Contract not deployed');
    }
    
    console.log(`   ✓ Raydium contract deployed at: ${dappConfig.raydium.swapContract}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ Raydium test failed: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 6: Проверка NFT контракта ===
  console.log('\n🎁 Test 6: NFT Rewards System');
  try {
    const nftABI = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function getGlobalStats() view returns (uint256, uint256, uint256, uint256, uint256)"
    ];
    
    const nftContract = new ethers.Contract(
      dappConfig.nft.rewardsContract,
      nftABI,
      deployer
    );

    const name = await nftContract.name();
    const symbol = await nftContract.symbol();
    const [totalMinted, common, rare, epic, legendary] = await nftContract.getGlobalStats();
    
    console.log(`   ✓ NFT Contract: ${name} (${symbol})`);
    console.log(`   ✓ Stats: ${totalMinted} total, ${common}/${rare}/${epic}/${legendary} by rarity`);
    passed++;
  } catch (error) {
    console.log(`   ❌ NFT test failed: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 7: Проверка Solana интеграции ===
  console.log('\n🔗 Test 7: Solana Integration');
  try {
    // Проверяем SPL токены
    for (const [symbol, tokenInfo] of Object.entries(dappConfig.tokens)) {
      if (symbol === 'WNEON' || !tokenInfo.address_spl) continue;
      
      try {
        const mintPubkey = new PublicKey(tokenInfo.address_spl);
        const accountInfo = await connection.getAccountInfo(mintPubkey);
        
        if (accountInfo) {
          console.log(`   ✓ SPL ${symbol}: ${tokenInfo.address_spl}`);
        } else {
          console.log(`   ⚠️  SPL ${symbol}: account not found`);
        }
      } catch (error) {
        console.log(`   ❌ SPL ${symbol}: invalid address`);
      }
    }
    passed++;
  } catch (error) {
    console.log(`   ❌ Solana integration test failed: ${error.message}`);
    failed++;
  }

  // === ФИНАЛЬНЫЙ ОТЧЁТ ===
  console.log('\n🎯 === TEST RESULTS ===');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${Math.round(passed/(passed+failed)*100)}%\n`);

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Your dApp is ready to use.');
    console.log('\nNext steps:');
    console.log('1. Run: npm run airdrop <your_solana_wallet>');
    console.log('2. Start frontend: npm run dev');
    console.log('3. Test swaps in the UI');
  } else {
    console.log('⚠️  Some tests failed. Please check the deployment.');
  }

  return { passed, failed };
}

// Тест конкретного свапа
async function testSwap() {
  if (!configExists) {
    console.log('❌ Cannot test swaps without deployment. Run: npm run deploy first');
    return;
  }

  console.log('🔄 === TESTING SWAP FUNCTIONALITY ===\n');
  
  try {
    const [deployer] = await ethers.getSigners();
    
    // Получаем контракты
    const routerABI = [
      "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
    ];
    
    const router = new ethers.Contract(dappConfig.pancakeswap.router, routerABI, deployer);
    
    // Тестируем получение котировки
    const amountIn = ethers.parseEther('1'); // 1 токен
    const path = [
      dappConfig.tokens.WNEON.address,
      dappConfig.tokens.USDC.address
    ];
    
    const amounts = await router.getAmountsOut(amountIn, path);
    console.log(`💱 Swap quote: 1 WNEON = ${ethers.formatUnits(amounts[1], 6)} USDC`);
    
    console.log('✅ Swap test completed successfully!');
  } catch (error) {
    console.error('❌ Swap test failed:', error.message);
  }
}

// Основная функция
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';

  switch (testType) {
    case 'deployment':
      await testEnvironment();
      break;
    case 'swap':
      await testSwap();
      break;
    case 'all':
    default:
      await testEnvironment();
      if (configExists) {
        await testSwap();
      }
      break;
  }
}

// Экспорт для использования в других скриптах
module.exports = {
  testDeployment,
  testSwap,
  testEnvironment
};

// Запуск если вызван напрямую
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
} 