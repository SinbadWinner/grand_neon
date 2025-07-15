const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { 
  getOrCreateAssociatedTokenAccount, 
  mintTo, 
  getAssociatedTokenAddress 
} = require('@solana/spl-token');
const bs58 = require('bs58');
require('dotenv').config();

// Загружаем конфигурацию после деплоя
let dappConfig;
try {
  dappConfig = require('./dapp-config.js').dappConfig;
} catch (error) {
  console.error('❌ dapp-config.js not found. Please run deployment first.');
  process.exit(1);
}

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

async function airdropTestTokens(userWalletAddress) {
  console.log('🎁 Starting token airdrop...');
  console.log(`👤 User wallet: ${userWalletAddress}\n`);

  try {
    // Загружаем ключ деплоера (он имеет права на минт)
    const deployerPrivateKey = bs58.decode(process.env.SOLANA_WALLET);
    const deployerKeypair = Keypair.fromSecretKey(deployerPrivateKey);
    
    console.log(`🔑 Deployer wallet: ${deployerKeypair.publicKey.toString()}`);

    const userPublicKey = new PublicKey(userWalletAddress);
    
    // Получаем список токенов для аирдропа
    const tokens = dappConfig.tokens;
    const results = [];

    for (const [symbol, tokenInfo] of Object.entries(tokens)) {
      if (symbol === 'WNEON') continue; // WNEON не минтится, это wrapped token
      
      console.log(`\n💰 Processing ${symbol} (${tokenInfo.name})...`);
      
      try {
        // Получаем SPL mint address
        const mintPublicKey = new PublicKey(tokenInfo.address_spl);
        
        // Получаем или создаём ATA для пользователя
        const userTokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          deployerKeypair, // Payer
          mintPublicKey,   // Mint
          userPublicKey    // Owner
        );

        console.log(`   📋 Token Account: ${userTokenAccount.address.toString()}`);

        // Определяем количество токенов для аирдропа
        let amount;
        if (symbol === 'USDC') {
          amount = 1000 * Math.pow(10, tokenInfo.decimals); // 1000 USDC
        } else if (symbol === 'SOL') {
          amount = 10 * Math.pow(10, tokenInfo.decimals);   // 10 SOL
        } else {
          amount = 100 * Math.pow(10, tokenInfo.decimals);  // 100 других токенов
        }

        // Минтим токены пользователю
        const signature = await mintTo(
          connection,
          deployerKeypair,        // Payer
          mintPublicKey,          // Mint
          userTokenAccount.address, // Destination
          deployerKeypair,        // Mint authority
          amount                  // Amount
        );

        const humanAmount = amount / Math.pow(10, tokenInfo.decimals);
        console.log(`   ✅ Minted ${humanAmount} ${symbol}`);
        console.log(`   🔗 Transaction: ${signature}`);

        results.push({
          token: symbol,
          amount: humanAmount,
          signature,
          success: true
        });

      } catch (error) {
        console.log(`   ❌ Failed to airdrop ${symbol}: ${error.message}`);
        results.push({
          token: symbol,
          error: error.message,
          success: false
        });
      }
    }

    // Выводим итоговый отчёт
    console.log('\n🎉 === AIRDROP COMPLETED ===');
    console.log(`📊 Results for ${userWalletAddress}:\n`);

    let successCount = 0;
    let failCount = 0;

    results.forEach(result => {
      if (result.success) {
        console.log(`   ✅ ${result.token}: ${result.amount} tokens`);
        successCount++;
      } else {
        console.log(`   ❌ ${result.token}: ${result.error}`);
        failCount++;
      }
    });

    console.log(`\n📈 Summary: ${successCount} successful, ${failCount} failed`);
    
    if (successCount > 0) {
      console.log('\n🚀 Tokens are ready! You can now:');
      console.log('   1. Connect your Phantom wallet to the dApp');
      console.log('   2. Start swapping between different tokens');
      console.log('   3. Earn points and mint NFT rewards');
      console.log('\n💡 Note: It may take a few seconds for tokens to appear in your wallet.');
    }

    return results;

  } catch (error) {
    console.error('❌ Airdrop failed:', error);
    throw error;
  }
}

// Функция для аирдропа Solana (SOL) для оплаты комиссий
async function airdropSOL(userWalletAddress, amount = 1) {
  console.log(`💸 Requesting ${amount} SOL airdrop for ${userWalletAddress}...`);
  
  try {
    const userPublicKey = new PublicKey(userWalletAddress);
    const signature = await connection.requestAirdrop(
      userPublicKey,
      amount * 1e9 // Convert to lamports
    );
    
    await connection.confirmTransaction(signature);
    console.log(`✅ SOL airdrop completed: ${signature}`);
    return signature;
  } catch (error) {
    console.error('❌ SOL airdrop failed:', error.message);
    throw error;
  }
}

// Функция для проверки балансов пользователя
async function checkUserBalances(userWalletAddress) {
  console.log(`🔍 Checking balances for ${userWalletAddress}...\n`);
  
  try {
    const userPublicKey = new PublicKey(userWalletAddress);
    
    // Проверяем SOL баланс
    const solBalance = await connection.getBalance(userPublicKey);
    console.log(`💰 SOL Balance: ${solBalance / 1e9} SOL`);

    // Проверяем токен балансы
    const tokens = dappConfig.tokens;
    
    for (const [symbol, tokenInfo] of Object.entries(tokens)) {
      if (symbol === 'WNEON') continue;
      
      try {
        const mintPublicKey = new PublicKey(tokenInfo.address_spl);
        const ata = await getAssociatedTokenAddress(mintPublicKey, userPublicKey);
        
        const accountInfo = await connection.getTokenAccountBalance(ata);
        if (accountInfo && accountInfo.value) {
          console.log(`💰 ${symbol} Balance: ${accountInfo.value.uiAmount} ${symbol}`);
        } else {
          console.log(`💰 ${symbol} Balance: 0 ${symbol} (no account)`);
        }
      } catch (error) {
        console.log(`💰 ${symbol} Balance: 0 ${symbol} (${error.message})`);
      }
    }
  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
  }
}

// CLI интерфейс
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const userWallet = args[1];

  if (!command) {
    console.log('🎁 Multi-Swap dApp Token Airdrop\n');
    console.log('Usage:');
    console.log('  node airdrop-tokens.js airdrop <solana_wallet_address>');
    console.log('  node airdrop-tokens.js sol <solana_wallet_address> [amount]');
    console.log('  node airdrop-tokens.js balance <solana_wallet_address>');
    console.log('\nExamples:');
    console.log('  node airdrop-tokens.js airdrop 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
    console.log('  node airdrop-tokens.js sol 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM 2');
    console.log('  node airdrop-tokens.js balance 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM');
    return;
  }

  if (!userWallet) {
    console.error('❌ Please provide a Solana wallet address');
    return;
  }

  try {
    // Валидируем адрес кошелька
    new PublicKey(userWallet);
  } catch (error) {
    console.error('❌ Invalid Solana wallet address');
    return;
  }

  try {
    switch (command) {
      case 'airdrop':
        await airdropTestTokens(userWallet);
        break;
      
      case 'sol':
        const amount = args[2] ? parseFloat(args[2]) : 1;
        await airdropSOL(userWallet, amount);
        break;
      
      case 'balance':
        await checkUserBalances(userWallet);
        break;
      
      default:
        console.error('❌ Unknown command. Use: airdrop, sol, or balance');
    }
  } catch (error) {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  }
}

// Экспортируем функции для использования в других скриптах
module.exports = {
  airdropTestTokens,
  airdropSOL,
  checkUserBalances
};

// Запускаем CLI если файл запущен напрямую
if (require.main === module) {
  main();
} 