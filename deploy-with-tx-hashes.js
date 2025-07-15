const { ethers } = require("hardhat");
const fs = require('fs');

async function deployWithTransactionHashes() {
    console.log("🚀 === РАЗВЕРТЫВАНИЕ КОНТРАКТОВ С СОХРАНЕНИЕМ ХЕШЕЙ ТРАНЗАКЦИЙ ===\n");

    const deploymentInfo = {
        network: '',
        chainId: 0,
        deployer: '',
        deployerBalance: '',
        timestamp: new Date().toISOString(),
        contracts: {},
        transactionHashes: {},
        gasUsed: {},
        pairs: {}
    };

    try {
        const [deployer] = await ethers.getSigners();
        const provider = ethers.provider;
        const network = await provider.getNetwork();
        
        // Сохраняем информацию о сети
        deploymentInfo.network = network.name;
        deploymentInfo.chainId = Number(network.chainId);
        deploymentInfo.deployer = deployer.address;
        
        const balance = await provider.getBalance(deployer.address);
        deploymentInfo.deployerBalance = ethers.formatEther(balance);
        
        console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
        console.log(`⏰ Timestamp: ${deploymentInfo.timestamp}\n`);

        // === 1. DEPLOY WNEON ===
        console.log("🌊 === DEPLOYING WNEON ===");
        const WNEONFactory = await ethers.getContractFactory("WNEON");
        const wneon = await WNEONFactory.deploy();
        
        // Ждем развертывания и получаем receipt
        const wneonDeployment = await wneon.deploymentTransaction();
        const wneonReceipt = await wneonDeployment.wait();
        const wneonAddress = await wneon.getAddress();
        
        deploymentInfo.contracts.WNEON = wneonAddress;
        deploymentInfo.transactionHashes.WNEON = wneonReceipt.hash;
        deploymentInfo.gasUsed.WNEON = wneonReceipt.gasUsed.toString();
        
        console.log(`✅ WNEON deployed: ${wneonAddress}`);
        console.log(`📋 Transaction hash: ${wneonReceipt.hash}`);
        console.log(`⛽ Gas used: ${wneonReceipt.gasUsed.toString()}`);
        console.log(`🔗 Explorer: https://explorer.example.com/tx/${wneonReceipt.hash}`);

        // === 2. DEPLOY PANCAKEFACTORY ===
        console.log("\n🏭 === DEPLOYING PANCAKEFACTORY ===");
        const PancakeFactory = await ethers.getContractFactory("PancakeFactory");
        const factory = await PancakeFactory.deploy(deployer.address);
        
        const factoryDeployment = await factory.deploymentTransaction();
        const factoryReceipt = await factoryDeployment.wait();
        const factoryAddress = await factory.getAddress();
        
        deploymentInfo.contracts.PancakeFactory = factoryAddress;
        deploymentInfo.transactionHashes.PancakeFactory = factoryReceipt.hash;
        deploymentInfo.gasUsed.PancakeFactory = factoryReceipt.gasUsed.toString();
        
        console.log(`✅ PancakeFactory deployed: ${factoryAddress}`);
        console.log(`📋 Transaction hash: ${factoryReceipt.hash}`);
        console.log(`⛽ Gas used: ${factoryReceipt.gasUsed.toString()}`);
        console.log(`🔗 Explorer: https://explorer.example.com/tx/${factoryReceipt.hash}`);

        // === 3. DEPLOY PANCAKEROUTER ===
        console.log("\n🔄 === DEPLOYING PANCAKEROUTER ===");
        const PancakeRouter = await ethers.getContractFactory("PancakeRouter");
        const router = await PancakeRouter.deploy(factoryAddress, wneonAddress);
        
        const routerDeployment = await router.deploymentTransaction();
        const routerReceipt = await routerDeployment.wait();
        const routerAddress = await router.getAddress();
        
        deploymentInfo.contracts.PancakeRouter = routerAddress;
        deploymentInfo.transactionHashes.PancakeRouter = routerReceipt.hash;
        deploymentInfo.gasUsed.PancakeRouter = routerReceipt.gasUsed.toString();
        
        console.log(`✅ PancakeRouter deployed: ${routerAddress}`);
        console.log(`📋 Transaction hash: ${routerReceipt.hash}`);
        console.log(`⛽ Gas used: ${routerReceipt.gasUsed.toString()}`);
        console.log(`🔗 Explorer: https://explorer.example.com/tx/${routerReceipt.hash}`);

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
            
            const token = await MockERC20Factory.deploy(
                tokenConfig.name,
                tokenConfig.symbol,
                ethers.parseEther(tokenConfig.supply)
            );
            
            const tokenDeployment = await token.deploymentTransaction();
            const tokenReceipt = await tokenDeployment.wait();
            const tokenAddress = await token.getAddress();
            
            deploymentInfo.contracts[tokenConfig.symbol] = tokenAddress;
            deploymentInfo.transactionHashes[tokenConfig.symbol] = tokenReceipt.hash;
            deploymentInfo.gasUsed[tokenConfig.symbol] = tokenReceipt.gasUsed.toString();
            
            console.log(`✅ ${tokenConfig.symbol} deployed: ${tokenAddress}`);
            console.log(`📋 Transaction hash: ${tokenReceipt.hash}`);
            console.log(`⛽ Gas used: ${tokenReceipt.gasUsed.toString()}`);
            console.log(`🔗 Explorer: https://explorer.example.com/tx/${tokenReceipt.hash}`);
        }

        // === 5. DEPLOY RAYDIUM ===
        console.log("\n⚡ === DEPLOYING RAYDIUM ===");
        const RaydiumFactory = await ethers.getContractFactory("RaydiumSwapContract");
        const raydium = await RaydiumFactory.deploy();
        
        const raydiumDeployment = await raydium.deploymentTransaction();
        const raydiumReceipt = await raydiumDeployment.wait();
        const raydiumAddress = await raydium.getAddress();
        
        deploymentInfo.contracts.Raydium = raydiumAddress;
        deploymentInfo.transactionHashes.Raydium = raydiumReceipt.hash;
        deploymentInfo.gasUsed.Raydium = raydiumReceipt.gasUsed.toString();
        
        console.log(`✅ Raydium deployed: ${raydiumAddress}`);
        console.log(`📋 Transaction hash: ${raydiumReceipt.hash}`);
        console.log(`⛽ Gas used: ${raydiumReceipt.gasUsed.toString()}`);
        console.log(`🔗 Explorer: https://explorer.example.com/tx/${raydiumReceipt.hash}`);

        // === 6. DEPLOY NFT REWARDS ===
        console.log("\n🎨 === DEPLOYING NFT REWARDS ===");
        const NFTRewardsFactory = await ethers.getContractFactory("NFTRewardsContract");
        const nftRewards = await NFTRewardsFactory.deploy();
        
        const nftDeployment = await nftRewards.deploymentTransaction();
        const nftReceipt = await nftDeployment.wait();
        const nftAddress = await nftRewards.getAddress();
        
        deploymentInfo.contracts.NFTRewards = nftAddress;
        deploymentInfo.transactionHashes.NFTRewards = nftReceipt.hash;
        deploymentInfo.gasUsed.NFTRewards = nftReceipt.gasUsed.toString();
        
        console.log(`✅ NFT Rewards deployed: ${nftAddress}`);
        console.log(`📋 Transaction hash: ${nftReceipt.hash}`);
        console.log(`⛽ Gas used: ${nftReceipt.gasUsed.toString()}`);
        console.log(`🔗 Explorer: https://explorer.example.com/tx/${nftReceipt.hash}`);

        // === 7. CREATE TRADING PAIRS ===
        console.log("\n🌊 === CREATING TRADING PAIRS ===");
        const pairTokens = [
            { name: "USDC/WNEON", tokenA: deploymentInfo.contracts.USDC, tokenB: wneonAddress },
            { name: "USDT/WNEON", tokenA: deploymentInfo.contracts.USDT, tokenB: wneonAddress },
            { name: "BTC/WNEON", tokenA: deploymentInfo.contracts.BTC, tokenB: wneonAddress },
            { name: "ETH/WNEON", tokenA: deploymentInfo.contracts.ETH, tokenB: wneonAddress }
        ];

        for (const pair of pairTokens) {
            console.log(`\n🔄 Creating ${pair.name} pair...`);
            
            const createPairTx = await factory.createPair(pair.tokenA, pair.tokenB);
            const createPairReceipt = await createPairTx.wait();
            const pairAddress = await factory.getPair(pair.tokenA, pair.tokenB);
            
            deploymentInfo.pairs[pair.name] = pairAddress;
            deploymentInfo.transactionHashes[`${pair.name}_pair`] = createPairReceipt.hash;
            deploymentInfo.gasUsed[`${pair.name}_pair`] = createPairReceipt.gasUsed.toString();
            
            console.log(`✅ ${pair.name} pair created: ${pairAddress}`);
            console.log(`📋 Transaction hash: ${createPairReceipt.hash}`);
            console.log(`⛽ Gas used: ${createPairReceipt.gasUsed.toString()}`);
        }

        // === 8. SAVE DEPLOYMENT INFO ===
        console.log("\n💾 === SAVING DEPLOYMENT INFO ===");
        
        // Сохраняем полную информацию о развертывании
        fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("✅ Deployment info saved to: deployment-info.json");
        
        // Создаем файл с хешами транзакций
        const txHashes = {
            network: deploymentInfo.network,
            chainId: deploymentInfo.chainId,
            deployer: deploymentInfo.deployer,
            timestamp: deploymentInfo.timestamp,
            transactions: deploymentInfo.transactionHashes
        };
        
        fs.writeFileSync('transaction-hashes.json', JSON.stringify(txHashes, null, 2));
        console.log("✅ Transaction hashes saved to: transaction-hashes.json");
        
        // Создаем markdown отчет
        const mdReport = generateMarkdownReport(deploymentInfo);
        fs.writeFileSync('DEPLOYMENT_REPORT.md', mdReport);
        console.log("✅ Deployment report saved to: DEPLOYMENT_REPORT.md");

        // === 9. SUMMARY ===
        console.log("\n📊 === DEPLOYMENT SUMMARY ===");
        
        // Подсчитываем общий газ
        const totalGasUsed = Object.values(deploymentInfo.gasUsed).reduce((sum, gas) => sum + BigInt(gas), 0n);
        console.log(`⛽ Total gas used: ${totalGasUsed.toString()}`);
        
        console.log("\n🎯 === DEPLOYED CONTRACTS ===");
        for (const [name, address] of Object.entries(deploymentInfo.contracts)) {
            console.log(`   ${name}: ${address}`);
        }
        
        console.log("\n🔗 === TRADING PAIRS ===");
        for (const [name, address] of Object.entries(deploymentInfo.pairs)) {
            console.log(`   ${name}: ${address}`);
        }
        
        console.log("\n📋 === TRANSACTION HASHES ===");
        for (const [name, hash] of Object.entries(deploymentInfo.transactionHashes)) {
            console.log(`   ${name}: ${hash}`);
        }
        
        console.log("\n🎉 === DEPLOYMENT COMPLETED SUCCESSFULLY! ===");
        console.log("📁 Files created:");
        console.log("   - deployment-info.json (full deployment details)");
        console.log("   - transaction-hashes.json (transaction hashes only)");
        console.log("   - DEPLOYMENT_REPORT.md (markdown report)");
        
        return deploymentInfo;
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        
        // Сохраняем информацию об ошибке
        deploymentInfo.error = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync('deployment-error.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("❌ Error info saved to: deployment-error.json");
        
        throw error;
    }
}

function generateMarkdownReport(deploymentInfo) {
    return `# 🚀 Deployment Report

## Network Information
- **Network**: ${deploymentInfo.network}
- **Chain ID**: ${deploymentInfo.chainId}
- **Deployer**: ${deploymentInfo.deployer}
- **Deployer Balance**: ${deploymentInfo.deployerBalance} ETH
- **Timestamp**: ${deploymentInfo.timestamp}

## Deployed Contracts

${Object.entries(deploymentInfo.contracts).map(([name, address]) => `
### ${name}
- **Address**: \`${address}\`
- **Transaction Hash**: \`${deploymentInfo.transactionHashes[name]}\`
- **Gas Used**: ${deploymentInfo.gasUsed[name]}
- **Explorer**: [View on Explorer](https://explorer.example.com/tx/${deploymentInfo.transactionHashes[name]})
`).join('')}

## Trading Pairs

${Object.entries(deploymentInfo.pairs).map(([name, address]) => `
### ${name}
- **Address**: \`${address}\`
- **Transaction Hash**: \`${deploymentInfo.transactionHashes[name + '_pair']}\`
- **Gas Used**: ${deploymentInfo.gasUsed[name + '_pair']}
`).join('')}

## Transaction Hashes Summary

| Contract | Transaction Hash | Gas Used |
|----------|------------------|----------|
${Object.entries(deploymentInfo.transactionHashes).map(([name, hash]) => 
    `| ${name} | \`${hash}\` | ${deploymentInfo.gasUsed[name] || 'N/A'} |`
).join('\n')}

## Total Gas Used
${Object.values(deploymentInfo.gasUsed).reduce((sum, gas) => sum + BigInt(gas), 0n).toString()}

---
*Generated on ${deploymentInfo.timestamp}*
`;
}

// Run the deployment
if (require.main === module) {
    deployWithTransactionHashes()
        .then(() => {
            console.log("\n✅ Deployment script completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Deployment script failed:", error);
            process.exit(1);
        });
}

module.exports = deployWithTransactionHashes; 