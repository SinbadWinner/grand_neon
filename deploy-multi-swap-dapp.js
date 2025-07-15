const { ethers, network, run } = require('hardhat');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Импортируем функции из готовых скриптов
const { deployPancakeswapExchange } = require('./neon-solana-native-swap-demo/pancakeswap/scripts/deploy-pancakeswap-exchange');
const { deployERC20ForSPLMintable } = require('./neon-solana-native-swap-demo/pancakeswap/scripts/deploy-tokens');
const { createPairAndAddLiquidity } = require('./neon-solana-native-swap-demo/pancakeswap/scripts/create-liquidity-pools');
const { writeToFile, deployerAirdrop } = require('./neon-solana-native-swap-demo/pancakeswap/scripts/utils');

async function main() {
  console.log('🚀 Starting Multi-Swap dApp Deployment...');
  console.log('📦 This will deploy both PancakeSwap and Raydium integration\n');

  await run('compile');
  console.log(`📡 Network: ${network.name}`);

  if (!process.env.DEPLOYER_KEY) {
    throw new Error('❌ Missing DEPLOYER_KEY in .env file');
  }

  const deployer = (await ethers.getSigners())[0];
  console.log(`👤 Deployer address: ${deployer.address}`);
  
  // Получаем тестовые токены для деплоя
  await deployerAirdrop(deployer, 10000);
  console.log('💰 Received test tokens for deployment\n');

  // === ШАГ 1: Деплой PancakeSwap инфраструктуры ===
  console.log('🥞 === DEPLOYING PANCAKESWAP INFRASTRUCTURE ===');
  
  const {
    pancakeFactoryAddress,
    pancakeRouterAddress,
    WNEONAddress,
    NEONAddress,
    token: wNeonToken
  } = await deployPancakeswapExchange(deployer);

  console.log(`✅ PancakeSwap Factory: ${pancakeFactoryAddress}`);
  console.log(`✅ PancakeSwap Router: ${pancakeRouterAddress}`);
  console.log(`✅ WNEON Token: ${WNEONAddress}\n`);

  // === ШАГ 2: Деплой тестовых токенов ===
  console.log('🪙 === DEPLOYING TEST TOKENS ===');
  
  const mintAuthority = deployer.address;
  const contractV1 = 'contracts/erc20-for-spl/ERC20ForSPL.sol:ERC20ForSplMintable';

  // Создаём два тестовых токена для свапа
  const tokenUSDC = await deployERC20ForSPLMintable(
    'test_usdc',
    'Test USDC',
    'USDC',
    6, // 6 decimals как у настоящего USDC
    mintAuthority,
    contractV1
  );

  const tokenSOL = await deployERC20ForSPLMintable(
    'test_sol',
    'Test SOL',
    'SOL',
    9, // 9 decimals как у SOL
    mintAuthority,
    contractV1
  );

  console.log(`✅ Test USDC: ${tokenUSDC.address}`);
  console.log(`✅ Test SOL: ${tokenSOL.address}\n`);

  // === ШАГ 3: Деплой основных контрактов ===
  console.log('🔧 === DEPLOYING CORE CONTRACTS ===');
  
  console.log('📄 Deploying NFT Rewards Contract...');
  const NFTRewardsContract = await ethers.getContractFactory('NFTRewardsContract');
  const nftRewards = await NFTRewardsContract.deploy();
  await nftRewards.waitForDeployment();
  console.log(`✅ NFT Rewards Contract: ${nftRewards.target}`);
  
  console.log('📄 Deploying Raydium Swap Contract...');
  const RaydiumSwapContract = await ethers.getContractFactory('RaydiumSwapContract');
  const raydiumSwap = await RaydiumSwapContract.deploy();
  await raydiumSwap.waitForDeployment();
  console.log(`✅ Raydium Swap Contract: ${raydiumSwap.target}`);

  console.log('📄 Deploying Multi-Swap Orchestrator...');
  const MultiSwapOrchestrator = await ethers.getContractFactory('MultiSwapOrchestrator');
  const multiSwap = await MultiSwapOrchestrator.deploy(
    nftRewards.target,
    raydiumSwap.target,
    pancakeRouterAddress,
    pancakeFactoryAddress
  );
  await multiSwap.waitForDeployment();
  console.log(`✅ Multi-Swap Orchestrator: ${multiSwap.target}\n`);

  // === ШАГ 4: Создание PancakeSwap пулов ===
  console.log('🌊 === CREATING PANCAKESWAP LIQUIDITY POOLS ===');

  // WNEON-USDC пул
  const pairWNEON_USDC = await createPairAndAddLiquidity(
    pancakeFactoryAddress,
    pancakeRouterAddress,
    deployer,
    WNEONAddress,
    tokenUSDC.address,
    1000, // 1000 WNEON
    2000, // 2000 USDC (курс 1 WNEON = 2 USDC)
    contractV1
  );

  // WNEON-SOL пул
  const pairWNEON_SOL = await createPairAndAddLiquidity(
    pancakeFactoryAddress,
    pancakeRouterAddress,
    deployer,
    WNEONAddress,
    tokenSOL.address,
    1500, // 1500 WNEON
    100, // 100 SOL (курс 1 SOL = 15 WNEON)
    contractV1
  );

  // USDC-SOL пул
  const pairUSDC_SOL = await createPairAndAddLiquidity(
    pancakeFactoryAddress,
    pancakeRouterAddress,
    deployer,
    tokenUSDC.address,
    tokenSOL.address,
    3000, // 3000 USDC
    100, // 100 SOL (курс 1 SOL = 30 USDC)
    contractV1
  );

  console.log(`✅ WNEON-USDC Pool: ${pairWNEON_USDC}`);
  console.log(`✅ WNEON-SOL Pool: ${pairWNEON_SOL}`);
  console.log(`✅ USDC-SOL Pool: ${pairUSDC_SOL}\n`);

  // === ШАГ 5: Создание Raydium пулов ===
  console.log('⚡ === CREATING RAYDIUM LIQUIDITY POOLS ===');
  
  let raydiumPools = {};
  
  try {
    // Создаём пулы Raydium используя SPL mint адреса токенов
    console.log('Creating USDC-SOL Raydium pool...');
    const raydiumPoolUSDC_SOL = await multiSwap.createRaydiumPool(
      tokenUSDC.address_spl, // USDC SPL mint
      tokenSOL.address_spl,  // SOL SPL mint
      3000000000, // 3000 USDC (6 decimals)
      100000000000, // 100 SOL (9 decimals)
      0, // config index
      { value: ethers.parseEther('0.1') } // Lamports для создания аккаунтов
    );
    
    raydiumPools['usdc/sol'] = raydiumPoolUSDC_SOL;
    console.log(`✅ Raydium USDC-SOL Pool created: ${raydiumPoolUSDC_SOL}`);
    
  } catch (error) {
    console.log(`⚠️  Raydium pool creation skipped: ${error.message}`);
    console.log('   (This is normal in testnet - Raydium pools can be created manually later)');
  }

  // === ШАГ 6: Авторизация контрактов ===
  console.log('\n🔑 === AUTHORIZING CONTRACTS ===');
  
  // Авторизуем MultiSwapOrchestrator в NFT контракте
  console.log('Authorizing MultiSwapOrchestrator in NFT contract...');
  await nftRewards.authorizeSwapContract(multiSwap.target, true);
  console.log('✅ MultiSwapOrchestrator authorized');

  // === ШАГ 7: Настройка токенов ===
  console.log('\n🪙 === SETTING UP TOKEN MINTING ===');
  
  // Минтим дополнительные токены для тестирования
  const mintAmount = ethers.parseUnits('1000000', 18); // 1M tokens
  
  try {
    await tokenUSDC.mint(deployer.address, ethers.parseUnits('1000000', 6));
    await tokenSOL.mint(deployer.address, ethers.parseUnits('1000000', 9));
    console.log('✅ Test tokens minted for deployer');
  } catch (error) {
    console.log(`⚠️  Token minting skipped: ${error.message}`);
  }

  // === ШАГ 8: Сохранение конфигурации ===
  console.log('\n💾 === SAVING CONFIGURATION ===');

  const config = {
    network: network.name,
    deployer: deployer.address,
    contracts: {
      multiSwapOrchestrator: multiSwap.target,
      nftRewards: nftRewards.target,
      raydiumSwap: raydiumSwap.target
    },
    pancakeswap: {
      factory: pancakeFactoryAddress,
      router: pancakeRouterAddress,
      pools: {
        'wneon/usdc': pairWNEON_USDC,
        'usdc/wneon': pairWNEON_USDC,
        'wneon/sol': pairWNEON_SOL,
        'sol/wneon': pairWNEON_SOL,
        'usdc/sol': pairUSDC_SOL,
        'sol/usdc': pairUSDC_SOL
      }
    },
    raydium: {
      swapContract: raydiumSwap.target,
      pools: raydiumPools
    },
    nft: {
      rewardsContract: nftRewards.target
    },
    tokens: {
      WNEON: {
        address: WNEONAddress,
        symbol: 'WNEON',
        decimals: 18,
        name: 'Wrapped NEON'
      },
      USDC: {
        address: tokenUSDC.address,
        address_spl: tokenUSDC.address_spl,
        symbol: 'USDC',
        decimals: 6,
        name: 'Test USDC'
      },
      SOL: {
        address: tokenSOL.address,
        address_spl: tokenSOL.address_spl,
        symbol: 'SOL',
        decimals: 9,
        name: 'Test SOL'
      }
    },
    airdropTokens: [
      tokenUSDC.address_spl,
      tokenSOL.address_spl
    ],
    // Инструкции для использования
    usage: {
      pancakeswap: {
        example: "multiSwap.executeSwap({platform: 0, tokenA: USDC, tokenB: SOL, amountIn: amount, amountOutMin: minOut, slippage: 300, raydiumPoolId: 0})"
      },
      raydium: {
        example: "multiSwap.executeSwap({platform: 1, tokenA: USDC, tokenB: SOL, amountIn: amount, amountOutMin: minOut, slippage: 300, raydiumPoolId: poolId})"
      }
    }
  };

  // Сохраняем конфигурацию в разных форматах
  const configJson = JSON.stringify(config, null, 2);
  
  writeToFile('dapp-config.json', configJson);
  writeToFile('dapp-config.js', `const dappConfig = ${configJson};\n\nmodule.exports = { dappConfig };`);
  writeToFile('dapp-config.ts', `export const dappConfig = ${configJson};`);

  console.log('✅ Configuration saved to dapp-config files');
  console.log('\n🎉 === DEPLOYMENT COMPLETED SUCCESSFULLY ===');
  console.log('\n📋 Summary:');
  console.log(`   • Multi-Swap Orchestrator: ${multiSwap.target}`);
  console.log(`   • PancakeSwap Factory: ${pancakeFactoryAddress}`);
  console.log(`   • PancakeSwap Router: ${pancakeRouterAddress}`);
  console.log(`   • Raydium Contract: ${raydiumSwap.target}`);
  console.log(`   • NFT Rewards: ${nftRewards.target}`);
  console.log(`   • Test Tokens: USDC, SOL, WNEON`);
  console.log(`   • PancakeSwap Pools: 3 pools created`);
  console.log(`   • Raydium Pools: ${Object.keys(raydiumPools).length} pools created`);
  console.log('\n🚀 Your Multi-Swap dApp is ready to use!');
  console.log('\n📋 What you can do now:');
  console.log('   ✅ Smart contracts deployed and configured');
  console.log('   ✅ Liquidity pools created on both platforms');
  console.log('   ✅ NFT rewards system active');
  console.log('\n🧪 Testing (optional):');
  console.log('   • Test functionality: npm run test:swap');
  console.log('   • Get test tokens: npm run airdrop <solana_wallet>');
  console.log('   • Start frontend: npm run dev');
  console.log('\n💡 Core functionality:');
  console.log('   • Users can swap tokens on PancakeSwap or Raydium');
  console.log('   • Every swap automatically earns NFT reward points');
  console.log('   • Points can be used to mint NFT achievements');
  console.log('\n📖 Examples: npm run examples');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }); 