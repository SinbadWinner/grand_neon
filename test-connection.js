const { ethers } = require('hardhat');
const { Connection } = require('@solana/web3.js');
require('dotenv').config();

async function testConnections() {
  console.log('🌐 === TESTING NETWORK CONNECTIONS ===\n');
  
  let passed = 0;
  let failed = 0;

  // === ТЕСТ 1: Проверка конфигурации Hardhat ===
  console.log('🔧 Test 1: Hardhat Configuration');
  try {
    const network = require('hardhat').network;
    console.log(`   ✓ Network: ${network.name}`);
    console.log(`   ✓ Chain ID: ${network.config.chainId}`);
    console.log(`   ✓ RPC URL: ${network.config.url || 'localhost'}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ Hardhat config error: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 2: Проверка EVM подключения ===
  console.log('\n⚡ Test 2: Neon EVM Connection');
  try {
    const provider = ethers.provider;
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    console.log(`   ✓ Connected to chain ID: ${network.chainId}`);
    console.log(`   ✓ Latest block: ${blockNumber}`);
    console.log(`   ✓ Network name: ${network.name}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ EVM connection failed: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 3: Проверка Solana подключения ===
  console.log('\n🔗 Test 3: Solana Devnet Connection');
  try {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const version = await connection.getVersion();
    const slot = await connection.getSlot();
    
    console.log(`   ✓ Solana version: ${version['solana-core']}`);
    console.log(`   ✓ Current slot: ${slot}`);
    console.log(`   ✓ Connected to devnet`);
    passed++;
  } catch (error) {
    console.log(`   ❌ Solana connection failed: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 4: Проверка кошелька деплоера ===
  console.log('\n👤 Test 4: Deployer Wallet');
  try {
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`   ✓ Deployer address: ${deployer.address}`);
    console.log(`   ✓ NEON balance: ${ethers.formatEther(balance)} NEON`);
    
    if (balance > 0) {
      console.log(`   ✓ Wallet has funds for deployment`);
    } else {
      console.log(`   ⚠️  Wallet needs NEON for deployment`);
    }
    passed++;
  } catch (error) {
    console.log(`   ❌ Wallet test failed: ${error.message}`);
    failed++;
  }

  // === ТЕСТ 5: Проверка зависимостей ===
  console.log('\n📦 Test 5: Dependencies Check');
  try {
    // Проверяем основные пакеты
    const hardhat = require('hardhat');
    const ethersPackage = require('ethers');
    const solanaWeb3 = require('@solana/web3.js');
    const splToken = require('@solana/spl-token');
    
    console.log(`   ✓ Hardhat: installed`);
    console.log(`   ✓ Ethers: v${ethersPackage.version}`);
    console.log(`   ✓ Solana web3.js: installed`);
    console.log(`   ✓ SPL Token: installed`);
    passed++;
  } catch (error) {
    console.log(`   ❌ Dependencies error: ${error.message}`);
    failed++;
  }

  // === ФИНАЛЬНЫЙ ОТЧЁТ ===
  console.log('\n🎯 === CONNECTION TEST RESULTS ===');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${Math.round(passed/(passed+failed)*100)}%\n`);

  if (failed === 0) {
    console.log('🎉 ALL CONNECTION TESTS PASSED!');
    console.log('\nYour environment is ready for deployment.');
    console.log('\nNext steps:');
    console.log('1. Run: npm run deploy');
    console.log('2. Run: npm run test (after deployment)');
  } else if (failed <= 2) {
    console.log('⚠️  Some connection issues detected, but deployment might still work.');
    console.log('Try running: npm run deploy');
  } else {
    console.log('❌ Multiple connection issues. Please check:');
    console.log('- Internet connection');
    console.log('- Environment variables (.env file)');
    console.log('- Network configurations');
  }

  return { passed, failed };
}

// Запуск если вызван напрямую
if (require.main === module) {
  testConnections()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Connection test failed:', error);
      process.exit(1);
    });
}

module.exports = { testConnections }; 