const { ethers } = require("hardhat");
const fs = require('fs');

// Функция задержки
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Функция для получения газовых параметров
async function getGasParams(contractFactory = null, constructorArgs = []) {
    try {
        console.log("🔍 Getting gas parameters...");
        
        // Получаем fee data
        const feeData = await ethers.provider.getFeeData();
        console.log("📊 Fee Data:", {
            gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' Gwei' : 'null',
            maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') + ' Gwei' : 'null',
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') + ' Gwei' : 'null'
        });
        
        // Используем фиксированный высокий газ прайс для Neon EVM
        let gasPrice = ethers.parseUnits('3500', 'gwei'); // 3500 Gwei минимум
        
        console.log(`⛽ Using fixed gas price: 3500 Gwei (high priority for Neon EVM)`);
        
        // Estimate gas limit если есть контракт
        let gasLimit = 5000000n; // Увеличили до 5M
        if (contractFactory && constructorArgs && constructorArgs.length >= 0) {
            try {
                const estimatedGas = await contractFactory.estimateGas.deploy(...constructorArgs);
                gasLimit = estimatedGas * 150n / 100n; // Добавляем 50% к оценке
                console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);
                console.log(`⛽ Gas limit (with 50% buffer): ${gasLimit.toString()}`);
            } catch (error) {
                console.log("⚠️ Gas estimation failed, using default:", error.message);
                gasLimit = 5000000n; // 5M fallback
            }
        }
        
        return {
            gasPrice: gasPrice,
            gasLimit: gasLimit
        };
    } catch (error) {
        console.log("⚠️ Gas parameter fetch failed, using fallback:", error.message);
        return {
            gasPrice: ethers.parseUnits('3500', 'gwei'), // 3500 Gwei fallback
            gasLimit: 5000000n // 5M gas limit fallback
        };
    }
}

// Функция для проверки nonce и отправки транзакции
async function deployWithRetry(factory, args, gasParams, name) {
    const [deployer] = await ethers.getSigners();
    
    // Используем confirmed nonce вместо pending чтобы избежать stuck транзакций
    const confirmedNonce = await ethers.provider.getTransactionCount(deployer.address, 'latest');
    const pendingNonce = await ethers.provider.getTransactionCount(deployer.address, 'pending');
    
    console.log(`📊 Confirmed nonce for ${name}: ${confirmedNonce}`);
    console.log(`📊 Pending nonce for ${name}: ${pendingNonce}`);
    
    if (pendingNonce > confirmedNonce) {
        console.log(`⚠️  Warning: ${pendingNonce - confirmedNonce} pending transactions detected`);
        console.log(`💡 Using confirmed nonce ${confirmedNonce} to avoid conflicts`);
    }
    
    try {
        console.log(`🚀 Deploying ${name}...`);
        console.log(`⛽ Gas limit: ${gasParams.gasLimit.toString()}`);
        console.log(`⛽ Gas price: ${ethers.formatUnits(gasParams.gasPrice, 'gwei')} Gwei`);
        console.log(`📊 Using confirmed nonce: ${confirmedNonce}`);
        
        const contract = await factory.deploy(...args, {
            gasLimit: gasParams.gasLimit,
            gasPrice: gasParams.gasPrice,
            nonce: confirmedNonce
        });
        
        const deploymentTx = await contract.deploymentTransaction();
        console.log(`📋 ${name} deployment tx sent: ${deploymentTx.hash}`);
        console.log(`🔗 Neon Explorer: https://devnet.neonscan.org/tx/${deploymentTx.hash}`);
        console.log("⏳ Waiting for confirmation (timeout: 5 minutes)...");
        
        // Ждем с таймаутом 5 минут
        const receipt = await deploymentTx.wait(1, 300000); // 1 confirmation, 5 min timeout
        const address = await contract.getAddress();
        
        console.log(`✅ ${name} deployed successfully!`);
        console.log(`📍 Address: ${address}`);
        console.log(`📋 Transaction hash: ${receipt.hash}`);
        console.log(`📦 Block number: ${receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
        
        return { contract, receipt, address };
    } catch (error) {
        console.error(`❌ ${name} deployment failed:`, error.message);
        
        // Если ошибка связана с nonce, пробуем увеличить nonce
        if (error.message.includes('nonce') || error.message.includes('replacement')) {
            console.log(`🔄 Retrying with nonce ${confirmedNonce + 1}...`);
            
            const retryContract = await factory.deploy(...args, {
                gasLimit: gasParams.gasLimit,
                gasPrice: gasParams.gasPrice,
                nonce: confirmedNonce + 1
            });
            
            const retryTx = await retryContract.deploymentTransaction();
            console.log(`📋 ${name} retry tx sent: ${retryTx.hash}`);
            
            const retryReceipt = await retryTx.wait(1, 300000);
            const retryAddress = await retryContract.getAddress();
            
            console.log(`✅ ${name} deployed on retry!`);
            return { contract: retryContract, receipt: retryReceipt, address: retryAddress };
        }
        
        throw error;
    }
}

async function deployToNeonEVM() {
    console.log("🚀 === РАЗВЕРТЫВАНИЕ В РЕАЛЬНОЙ СЕТИ NEON EVM ===\n");

    const deploymentInfo = {
        network: '',
        chainId: 0,
        deployer: '',
        deployerBalance: '',
        timestamp: new Date().toISOString(),
        contracts: {},
        transactionHashes: {},
        gasUsed: {},
        pairs: {},
        blockNumbers: {},
        confirmations: {}
    };

    try {
        // Проверяем что мы используем правильную сеть
        const network = await ethers.provider.getNetwork();
        console.log(`🌐 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
        
        if (network.chainId !== 245022926n) {
            console.log("⚠️  WARNING: Expected Neon EVM devnet (Chain ID: 245022926)");
            console.log("   Current network Chain ID:", network.chainId.toString());
            console.log("   Make sure you're using: npx hardhat run deploy-neon-evm.js --network neondevnet");
        }

        const [deployer] = await ethers.getSigners();
        const balance = await ethers.provider.getBalance(deployer.address);
        
        deploymentInfo.network = network.name;
        deploymentInfo.chainId = Number(network.chainId);
        deploymentInfo.deployer = deployer.address;
        deploymentInfo.deployerBalance = ethers.formatEther(balance);
        
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} NEON`);
        console.log(`⏰ Timestamp: ${deploymentInfo.timestamp}\n`);

        // Проверяем достаточно ли баланса для деплоя
        if (balance < ethers.parseEther("1")) {
            console.log("⚠️  WARNING: Low balance! Make sure you have enough NEON for gas fees");
        }

        // === 1. DEPLOY WNEON ===
        console.log("🌊 === DEPLOYING WNEON ===");
        const WNEONFactory = await ethers.getContractFactory("WNEON");
        
        // Получаем газовые параметры для WNEON
        const wneonGasParams = await getGasParams(WNEONFactory, []);
        console.log(`⛽ WNEON gas params: ${wneonGasParams.gasLimit.toString()} limit, ${ethers.formatUnits(wneonGasParams.gasPrice, 'gwei')} Gwei`);
        
        const wneonDeployment = await deployWithRetry(WNEONFactory, [], wneonGasParams, "WNEON");
        const wneon = wneonDeployment.contract;
        
        deploymentInfo.contracts.WNEON = wneonDeployment.address;
        deploymentInfo.transactionHashes.WNEON = wneonDeployment.receipt.hash;
        deploymentInfo.gasUsed.WNEON = wneonDeployment.receipt.gasUsed.toString();
        deploymentInfo.blockNumbers.WNEON = wneonDeployment.receipt.blockNumber;
        deploymentInfo.confirmations.WNEON = wneonDeployment.receipt.confirmations;
        
        console.log(`✅ WNEON deployed: ${wneonDeployment.address}`);
        console.log(`📋 Transaction hash: ${wneonDeployment.receipt.hash}`);
        console.log(`📦 Block number: ${wneonDeployment.receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${wneonDeployment.receipt.gasUsed.toString()}`);
        console.log(`🔗 Neon Explorer: https://devnet.neonscan.org/tx/${wneonDeployment.receipt.hash}`);
        
        console.log("\n⏰ Waiting 30 seconds for network to update...");
        await sleep(30000);

        // === 2. DEPLOY PANCAKEFACTORY ===
        console.log("\n🏭 === DEPLOYING PANCAKEFACTORY ===");
        const PancakeFactory = await ethers.getContractFactory("PancakeFactory");
        
        // Получаем газовые параметры для PancakeFactory
        const factoryGasParams = await getGasParams(PancakeFactory, [deployer.address]);
        console.log(`⛽ PancakeFactory gas params: ${factoryGasParams.gasLimit.toString()} limit, ${ethers.formatUnits(factoryGasParams.gasPrice, 'gwei')} Gwei`);
        
        const factoryDeployment = await deployWithRetry(PancakeFactory, [deployer.address], factoryGasParams, "PancakeFactory");
        const factory = factoryDeployment.contract;
        
        deploymentInfo.contracts.PancakeFactory = factoryDeployment.address;
        deploymentInfo.transactionHashes.PancakeFactory = factoryDeployment.receipt.hash;
        deploymentInfo.gasUsed.PancakeFactory = factoryDeployment.receipt.gasUsed.toString();
        deploymentInfo.blockNumbers.PancakeFactory = factoryDeployment.receipt.blockNumber;
        deploymentInfo.confirmations.PancakeFactory = factoryDeployment.receipt.confirmations;
        
        console.log(`✅ PancakeFactory deployed: ${factoryDeployment.address}`);
        console.log(`📋 Transaction hash: ${factoryDeployment.receipt.hash}`);
        console.log(`📦 Block number: ${factoryDeployment.receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${factoryDeployment.receipt.gasUsed.toString()}`);
        console.log(`🔗 Neon Explorer: https://devnet.neonscan.org/tx/${factoryDeployment.receipt.hash}`);
        
        console.log("\n⏰ Waiting 30 seconds for network to update...");
        await sleep(30000);

        // === 3. DEPLOY PANCAKEROUTER ===
        console.log("\n🔄 === DEPLOYING PANCAKEROUTER ===");
        const PancakeRouter = await ethers.getContractFactory("PancakeRouter");
        
        // Получаем газовые параметры для PancakeRouter
        const routerGasParams = await getGasParams(PancakeRouter, [factoryDeployment.address, wneonDeployment.address]);
        console.log(`⛽ PancakeRouter gas params: ${routerGasParams.gasLimit.toString()} limit, ${ethers.formatUnits(routerGasParams.gasPrice, 'gwei')} Gwei`);
        
        const routerDeployment = await deployWithRetry(PancakeRouter, [factoryDeployment.address, wneonDeployment.address], routerGasParams, "PancakeRouter");
        const router = routerDeployment.contract;
        
        deploymentInfo.contracts.PancakeRouter = routerDeployment.address;
        deploymentInfo.transactionHashes.PancakeRouter = routerDeployment.receipt.hash;
        deploymentInfo.gasUsed.PancakeRouter = routerDeployment.receipt.gasUsed.toString();
        deploymentInfo.blockNumbers.PancakeRouter = routerDeployment.receipt.blockNumber;
        deploymentInfo.confirmations.PancakeRouter = routerDeployment.receipt.confirmations;
        
        console.log(`✅ PancakeRouter deployed: ${routerDeployment.address}`);
        console.log(`📋 Transaction hash: ${routerDeployment.receipt.hash}`);
        console.log(`📦 Block number: ${routerDeployment.receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${routerDeployment.receipt.gasUsed.toString()}`);
        console.log(`🔗 Neon Explorer: https://devnet.neonscan.org/tx/${routerDeployment.receipt.hash}`);
        
        console.log("\n⏰ Waiting 30 seconds for network to update...");
        await sleep(30000);

        // === 4. DEPLOY MOCK TOKENS ===
        console.log("\n💰 === DEPLOYING MOCK TOKENS ===");
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        
        const tokenConfigs = [
            { name: "USD Coin", symbol: "USDC", supply: "1000000" },
            { name: "Tether USD", symbol: "USDT", supply: "1000000" },
            { name: "Bitcoin", symbol: "BTC", supply: "21000" },
            { name: "Ethereum", symbol: "ETH", supply: "120000000" }
        ];

        for (const tokenConfig of tokenConfigs) {
            console.log(`\n💎 Deploying ${tokenConfig.symbol}...`);
            
            // Получаем газовые параметры для каждого токена
            const tokenGasParams = await getGasParams(MockERC20Factory, [
                tokenConfig.name,
                tokenConfig.symbol,
                ethers.parseEther(tokenConfig.supply)
            ]);
            console.log(`⛽ ${tokenConfig.symbol} gas params: ${tokenGasParams.gasLimit.toString()} limit, ${ethers.formatUnits(tokenGasParams.gasPrice, 'gwei')} Gwei`);
            
            const tokenDeployment = await deployWithRetry(MockERC20Factory, [
                tokenConfig.name,
                tokenConfig.symbol,
                ethers.parseEther(tokenConfig.supply)
            ], tokenGasParams, tokenConfig.symbol);
            const token = tokenDeployment.contract;
            
            deploymentInfo.contracts[tokenConfig.symbol] = tokenDeployment.address;
            deploymentInfo.transactionHashes[tokenConfig.symbol] = tokenDeployment.receipt.hash;
            deploymentInfo.gasUsed[tokenConfig.symbol] = tokenDeployment.receipt.gasUsed.toString();
            deploymentInfo.blockNumbers[tokenConfig.symbol] = tokenDeployment.receipt.blockNumber;
            deploymentInfo.confirmations[tokenConfig.symbol] = tokenDeployment.receipt.confirmations;
            
            console.log(`✅ ${tokenConfig.symbol} deployed: ${tokenDeployment.address}`);
            console.log(`📋 Transaction hash: ${tokenDeployment.receipt.hash}`);
            console.log(`📦 Block number: ${tokenDeployment.receipt.blockNumber}`);
            console.log(`⛽ Gas used: ${tokenDeployment.receipt.gasUsed.toString()}`);
            console.log(`🔗 Neon Explorer: https://devnet.neonscan.org/tx/${tokenDeployment.receipt.hash}`);
            
            console.log("\n⏰ Waiting 30 seconds for network to update...");
            await sleep(30000);
        }

        // === 5. DEPLOY RAYDIUM ===
        console.log("\n⚡ === DEPLOYING RAYDIUM ===");
        const RaydiumFactory = await ethers.getContractFactory("RaydiumSwapContract");
        
        // Получаем газовые параметры для Raydium
        const raydiumGasParams = await getGasParams(RaydiumFactory, []);
        console.log(`⛽ Raydium gas params: ${raydiumGasParams.gasLimit.toString()} limit, ${ethers.formatUnits(raydiumGasParams.gasPrice, 'gwei')} Gwei`);
        
        const raydiumDeployment = await deployWithRetry(RaydiumFactory, [], raydiumGasParams, "Raydium");
        const raydium = raydiumDeployment.contract;
        
        deploymentInfo.contracts.Raydium = raydiumDeployment.address;
        deploymentInfo.transactionHashes.Raydium = raydiumDeployment.receipt.hash;
        deploymentInfo.gasUsed.Raydium = raydiumDeployment.receipt.gasUsed.toString();
        deploymentInfo.blockNumbers.Raydium = raydiumDeployment.receipt.blockNumber;
        deploymentInfo.confirmations.Raydium = raydiumDeployment.receipt.confirmations;
        
        console.log(`✅ Raydium deployed: ${raydiumDeployment.address}`);
        console.log(`📋 Transaction hash: ${raydiumDeployment.receipt.hash}`);
        console.log(`📦 Block number: ${raydiumDeployment.receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${raydiumDeployment.receipt.gasUsed.toString()}`);
        console.log(`🔗 Neon Explorer: https://devnet.neonscan.org/tx/${raydiumDeployment.receipt.hash}`);
        
        console.log("\n⏰ Waiting 30 seconds for network to update...");
        await sleep(30000);

        // === 6. DEPLOY NFT REWARDS ===
        console.log("\n🎨 === DEPLOYING NFT REWARDS ===");
        const NFTRewardsFactory = await ethers.getContractFactory("NFTRewardsContract");
        
        // Получаем газовые параметры для NFT Rewards
        const nftGasParams = await getGasParams(NFTRewardsFactory, []);
        console.log(`⛽ NFT Rewards gas params: ${nftGasParams.gasLimit.toString()} limit, ${ethers.formatUnits(nftGasParams.gasPrice, 'gwei')} Gwei`);
        
        const nftRewardsDeployment = await deployWithRetry(NFTRewardsFactory, [], nftGasParams, "NFTRewards");
        const nftRewards = nftRewardsDeployment.contract;
        
        deploymentInfo.contracts.NFTRewards = nftRewardsDeployment.address;
        deploymentInfo.transactionHashes.NFTRewards = nftRewardsDeployment.receipt.hash;
        deploymentInfo.gasUsed.NFTRewards = nftRewardsDeployment.receipt.gasUsed.toString();
        deploymentInfo.blockNumbers.NFTRewards = nftRewardsDeployment.receipt.blockNumber;
        deploymentInfo.confirmations.NFTRewards = nftRewardsDeployment.receipt.confirmations;
        
        console.log(`✅ NFT Rewards deployed: ${nftRewardsDeployment.address}`);
        console.log(`📋 Transaction hash: ${nftRewardsDeployment.receipt.hash}`);
        console.log(`📦 Block number: ${nftRewardsDeployment.receipt.blockNumber}`);
        console.log(`⛽ Gas used: ${nftRewardsDeployment.receipt.gasUsed.toString()}`);
        console.log(`🔗 Neon Explorer: https://devnet.neonscan.org/tx/${nftRewardsDeployment.receipt.hash}`);
        
        console.log("\n⏰ Waiting 30 seconds for network to update...");
        await sleep(30000);

        // === 7. CREATE TRADING PAIRS ===
        console.log("\n🌊 === CREATING TRADING PAIRS ===");
        const pairTokens = [
            { name: "USDC/WNEON", tokenA: deploymentInfo.contracts.USDC, tokenB: wneonDeployment.address },
            { name: "USDT/WNEON", tokenA: deploymentInfo.contracts.USDT, tokenB: wneonDeployment.address },
            { name: "BTC/WNEON", tokenA: deploymentInfo.contracts.BTC, tokenB: wneonDeployment.address },
            { name: "ETH/WNEON", tokenA: deploymentInfo.contracts.ETH, tokenB: wneonDeployment.address }
        ];

        for (const pair of pairTokens) {
            console.log(`\n🔄 Creating ${pair.name} pair...`);
            
            // Получаем газовые параметры для создания пары
            try {
                const estimatedGas = await factory.createPair.estimateGas(pair.tokenA, pair.tokenB);
                const pairGasParams = await getGasParams(); // Get general gas params
                const pairGasLimit = estimatedGas * 120n / 100n; // 20% buffer
                
                console.log(`⛽ ${pair.name} pair gas params: ${pairGasLimit.toString()} limit, ${ethers.formatUnits(pairGasParams.gasPrice, 'gwei')} Gwei`);
                
                const createPairTx = await factory.createPair(pair.tokenA, pair.tokenB, {
                    gasLimit: pairGasLimit,
                    gasPrice: pairGasParams.gasPrice
                });
                
                console.log(`📋 ${pair.name} pair creation tx sent: ${createPairTx.hash}`);
                console.log("⏳ Waiting for confirmation...");
                
                const createPairReceipt = await createPairTx.wait();
                const pairAddress = await factory.getPair(pair.tokenA, pair.tokenB);
                
                deploymentInfo.pairs[pair.name] = pairAddress;
                deploymentInfo.transactionHashes[`${pair.name}_pair`] = createPairReceipt.hash;
                deploymentInfo.gasUsed[`${pair.name}_pair`] = createPairReceipt.gasUsed.toString();
                deploymentInfo.blockNumbers[`${pair.name}_pair`] = createPairReceipt.blockNumber;
                deploymentInfo.confirmations[`${pair.name}_pair`] = createPairReceipt.confirmations;
                
                console.log(`✅ ${pair.name} pair created: ${pairAddress}`);
                console.log(`📋 Transaction hash: ${createPairReceipt.hash}`);
                console.log(`📦 Block number: ${createPairReceipt.blockNumber}`);
                console.log(`⛽ Gas used: ${createPairReceipt.gasUsed.toString()}`);
                console.log(`🔗 Neon Explorer: https://devnet.neonscan.org/tx/${createPairReceipt.hash}`);
                
                console.log("\n⏰ Waiting 30 seconds for network to update...");
                await sleep(30000);
            } catch (error) {
                console.error(`❌ Failed to create ${pair.name} pair:`, error.message);
                // Продолжаем с другими парами
            }
        }

        // === 8. SAVE DEPLOYMENT INFO ===
        console.log("\n💾 === SAVING DEPLOYMENT INFO ===");
        
        const filename = `neon-evm-deployment-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
        console.log(`✅ Deployment info saved to: ${filename}`);
        
        const txHashesFilename = `neon-evm-tx-hashes-${Date.now()}.json`;
        const txHashes = {
            network: deploymentInfo.network,
            chainId: deploymentInfo.chainId,
            deployer: deploymentInfo.deployer,
            timestamp: deploymentInfo.timestamp,
            transactions: deploymentInfo.transactionHashes
        };
        
        fs.writeFileSync(txHashesFilename, JSON.stringify(txHashes, null, 2));
        console.log(`✅ Transaction hashes saved to: ${txHashesFilename}`);
        
        const mdReportFilename = `NEON_EVM_DEPLOYMENT_REPORT_${Date.now()}.md`;
        const mdReport = generateNeonEVMReport(deploymentInfo);
        fs.writeFileSync(mdReportFilename, mdReport);
        console.log(`✅ Deployment report saved to: ${mdReportFilename}`);

        // === 9. FINAL SUMMARY ===
        console.log("\n📊 === FINAL DEPLOYMENT SUMMARY ===");
        
        const totalGasUsed = Object.values(deploymentInfo.gasUsed).reduce((sum, gas) => sum + BigInt(gas), 0n);
        console.log(`⛽ Total gas used: ${totalGasUsed.toString()}`);
        
        const finalBalance = await ethers.provider.getBalance(deployer.address);
        const gasSpent = balance - finalBalance;
        console.log(`💰 Gas spent: ${ethers.formatEther(gasSpent)} NEON`);
        console.log(`💰 Remaining balance: ${ethers.formatEther(finalBalance)} NEON`);
        
        console.log("\n🎯 === DEPLOYED CONTRACTS ON NEON EVM ===");
        for (const [name, address] of Object.entries(deploymentInfo.contracts)) {
            console.log(`   ${name}: ${address}`);
            console.log(`      Explorer: https://devnet.neonscan.org/address/${address}`);
        }
        
        console.log("\n🔗 === TRADING PAIRS ON NEON EVM ===");
        for (const [name, address] of Object.entries(deploymentInfo.pairs)) {
            console.log(`   ${name}: ${address}`);
            console.log(`      Explorer: https://devnet.neonscan.org/address/${address}`);
        }
        
        console.log("\n🎉 === DEPLOYMENT TO NEON EVM COMPLETED SUCCESSFULLY! ===");
        console.log("📁 Files created:");
        console.log(`   - ${filename} (full deployment details)`);
        console.log(`   - ${txHashesFilename} (transaction hashes only)`);
        console.log(`   - ${mdReportFilename} (markdown report)`);
        console.log("\n🔍 All transaction hashes can be verified on Neon Explorer:");
        console.log("   https://devnet.neonscan.org/");
        
        return deploymentInfo;
        
    } catch (error) {
        console.error("❌ Deployment to Neon EVM failed:", error.message);
        
        deploymentInfo.error = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        
        const errorFilename = `neon-evm-deployment-error-${Date.now()}.json`;
        fs.writeFileSync(errorFilename, JSON.stringify(deploymentInfo, null, 2));
        console.log(`❌ Error info saved to: ${errorFilename}`);
        
        throw error;
    }
}

function generateNeonEVMReport(deploymentInfo) {
    return `# 🚀 Neon EVM Deployment Report

## Network Information
- **Network**: ${deploymentInfo.network}
- **Chain ID**: ${deploymentInfo.chainId}
- **Deployer**: ${deploymentInfo.deployer}
- **Deployer Balance**: ${deploymentInfo.deployerBalance} NEON
- **Timestamp**: ${deploymentInfo.timestamp}

## Deployed Contracts on Neon EVM

${Object.entries(deploymentInfo.contracts).map(([name, address]) => `
### ${name}
- **Address**: \`${address}\`
- **Transaction Hash**: \`${deploymentInfo.transactionHashes[name]}\`
- **Block Number**: ${deploymentInfo.blockNumbers[name]}
- **Gas Used**: ${deploymentInfo.gasUsed[name]}
- **Confirmations**: ${deploymentInfo.confirmations[name]}
- **Neon Explorer**: [View Contract](https://devnet.neonscan.org/address/${address})
- **Transaction**: [View Transaction](https://devnet.neonscan.org/tx/${deploymentInfo.transactionHashes[name]})
`).join('')}

## Trading Pairs on Neon EVM

${Object.entries(deploymentInfo.pairs).map(([name, address]) => `
### ${name}
- **Address**: \`${address}\`
- **Transaction Hash**: \`${deploymentInfo.transactionHashes[name + '_pair']}\`
- **Block Number**: ${deploymentInfo.blockNumbers[name + '_pair']}
- **Gas Used**: ${deploymentInfo.gasUsed[name + '_pair']}
- **Neon Explorer**: [View Pair](https://devnet.neonscan.org/address/${address})
`).join('')}

## Transaction Hashes Summary

| Contract | Transaction Hash | Block Number | Gas Used |
|----------|------------------|--------------|----------|
${Object.entries(deploymentInfo.transactionHashes).map(([name, hash]) => 
    `| ${name} | [\`${hash}\`](https://devnet.neonscan.org/tx/${hash}) | ${deploymentInfo.blockNumbers[name] || 'N/A'} | ${deploymentInfo.gasUsed[name] || 'N/A'} |`
).join('\n')}

## Total Gas Used
${Object.values(deploymentInfo.gasUsed).reduce((sum, gas) => sum + BigInt(gas), 0n).toString()}

## Explorer Links
- **Neon Devnet Explorer**: https://devnet.neonscan.org/
- **All contracts can be verified using the addresses above**

---
*Generated on ${deploymentInfo.timestamp}*
*Deployed to Neon EVM Devnet (Chain ID: ${deploymentInfo.chainId})*
`;
}

module.exports = deployToNeonEVM;

// Выполняем деплой если скрипт запущен напрямую
if (require.main === module) {
    deployToNeonEVM().catch(console.error);
} 