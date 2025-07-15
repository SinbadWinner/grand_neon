const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function deployOwnTokens() {
    console.log("🚀 === DEPLOYING OWN TOKEN ECOSYSTEM ===\n");
    console.log("📝 Creating completely custom token ecosystem:");
    console.log("   - BASE: Our native base token (instead of WNEON)");
    console.log("   - USDC: Mock USD Coin");
    console.log("   - USDT: Mock Tether USD");
    console.log("   - BTC: Mock Bitcoin");
    console.log("   - ETH: Mock Ethereum");
    console.log("   - All tokens use same BaseToken contract\n");
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);
        
        // === 1. DEPLOY BASE TOKEN (замена WNEON) ===
        console.log("🌊 === STEP 1: DEPLOYING BASE TOKEN ===");
        
        const BaseTokenFactory = await ethers.getContractFactory("BaseToken");
        const baseToken = await BaseTokenFactory.deploy(
            "Platform Base Token",
            "BASE",
            ethers.parseEther("10000000"), // 10M supply
            18 // decimals
        );
        await baseToken.waitForDeployment();
        const baseTokenAddress = await baseToken.getAddress();
        console.log(`✅ BASE deployed: ${baseTokenAddress}`);
        
        // === 2. DEPLOY ALL TOKENS ===
        console.log("\n💰 === STEP 2: DEPLOYING ALL TOKENS ===");
        
        const tokens = { base: baseTokenAddress };
        
        const tokenConfigs = [
            { name: "USD Coin", symbol: "USDC", supply: "1000000", decimals: 6 },
            { name: "Tether USD", symbol: "USDT", supply: "1000000", decimals: 6 },
            { name: "Bitcoin", symbol: "BTC", supply: "21000", decimals: 8 },
            { name: "Ethereum", symbol: "ETH", supply: "120000000", decimals: 18 }
        ];
        
        for (const tokenConfig of tokenConfigs) {
            const token = await BaseTokenFactory.deploy(
                tokenConfig.name,
                tokenConfig.symbol,
                ethers.parseUnits(tokenConfig.supply, tokenConfig.decimals),
                tokenConfig.decimals
            );
            await token.waitForDeployment();
            const tokenAddress = await token.getAddress();
            tokens[tokenConfig.symbol.toLowerCase()] = tokenAddress;
            console.log(`✅ ${tokenConfig.symbol} deployed: ${tokenAddress}`);
        }
        
        // === 3. DEPLOY PANCAKESWAP CONTRACTS ===
        console.log("\n🥞 === STEP 3: DEPLOYING PANCAKESWAP ===");
        
        // Deploy PancakeFactory
        const PancakeFactory = await ethers.getContractFactory("PancakeFactory");
        const factory = await PancakeFactory.deploy(deployer.address);
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();
        console.log(`✅ PancakeFactory deployed: ${factoryAddress}`);
        
        // Deploy PancakeRouter с BASE токеном
        const PancakeRouter = await ethers.getContractFactory("PancakeRouter");
        const router = await PancakeRouter.deploy(factoryAddress, baseTokenAddress);
        await router.waitForDeployment();
        const routerAddress = await router.getAddress();
        console.log(`✅ PancakeRouter deployed: ${routerAddress}`);
        
        // === 4. СОЗДАНИЕ ТОРГОВЫХ ПАР ===
        console.log("\n🔄 === STEP 4: CREATING TRADING PAIRS ===");
        
        const pairs = [];
        const pairTokens = ['usdc', 'usdt', 'btc', 'eth'];
        
        for (const symbol of pairTokens) {
            const tokenAddress = tokens[symbol];
            console.log(`📊 Creating ${symbol.toUpperCase()}/BASE pair...`);
            
            const tx = await factory.createPair(tokenAddress, baseTokenAddress);
            await tx.wait();
            
            const pairAddress = await factory.getPair(tokenAddress, baseTokenAddress);
            pairs.push({
                symbol: symbol.toUpperCase(),
                address: pairAddress,
                token0: tokenAddress,
                token1: baseTokenAddress
            });
            
            console.log(`   ✅ ${symbol.toUpperCase()}/BASE pair: ${pairAddress}`);
        }
        
        // === 5. INITIAL LIQUIDITY SETUP ===
        console.log("\n🏊 === STEP 5: SETTING UP INITIAL LIQUIDITY ===");
        
        // Подготавливаем ликвидность для каждой пары
        const liquiditySetups = [
            { symbol: 'usdc', baseAmount: '1000', tokenAmount: '1000' },
            { symbol: 'usdt', baseAmount: '1000', tokenAmount: '1000' },
            { symbol: 'btc', baseAmount: '500', tokenAmount: '1' },
            { symbol: 'eth', baseAmount: '100', tokenAmount: '10' }
        ];
        
        for (const setup of liquiditySetups) {
            const tokenContract = await ethers.getContractAt("BaseToken", tokens[setup.symbol]);
            const tokenInfo = tokenConfigs.find(t => t.symbol.toLowerCase() === setup.symbol);
            
            const baseAmount = ethers.parseEther(setup.baseAmount);
            const tokenAmount = ethers.parseUnits(setup.tokenAmount, tokenInfo.decimals);
            
            console.log(`💧 Setting up ${setup.symbol.toUpperCase()}/BASE liquidity...`);
            
            // Approve tokens
            await baseToken.approve(routerAddress, baseAmount);
            await tokenContract.approve(routerAddress, tokenAmount);
            
            // Add liquidity
            await router.addLiquidity(
                tokens[setup.symbol],
                baseTokenAddress,
                tokenAmount,
                baseAmount,
                0, // min amounts
                0,
                deployer.address,
                Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
            );
            
            console.log(`   ✅ Added ${setup.tokenAmount} ${setup.symbol.toUpperCase()} + ${setup.baseAmount} BASE`);
        }
        
        // === 6. DEPLOY RAYDIUM & NFT SYSTEM ===
        console.log("\n🌈 === STEP 6: DEPLOYING ADDITIONAL SYSTEMS ===");
        
        // Deploy Raydium
        const RaydiumFactory = await ethers.getContractFactory("RaydiumSwapContract");
        const raydium = await RaydiumFactory.deploy();
        await raydium.waitForDeployment();
        const raydiumAddress = await raydium.getAddress();
        console.log(`✅ Raydium deployed: ${raydiumAddress}`);
        
        // Deploy NFT Rewards
        const NFTRewardsFactory = await ethers.getContractFactory("NFTRewardsContract");
        const nftRewards = await NFTRewardsFactory.deploy(
            "Trading Rewards NFT",
            "TRN",
            "https://api.example.com/nft/"
        );
        await nftRewards.waitForDeployment();
        const nftRewardsAddress = await nftRewards.getAddress();
        console.log(`✅ NFT Rewards deployed: ${nftRewardsAddress}`);
        
        // === 7. ОБНОВЛЕНИЕ КОНФИГУРАЦИИ ===
        console.log("\n📝 === STEP 7: UPDATING CONFIGURATION ===");
        
        // Обновляем конфигурацию
        config.updatePancakeSwap(factoryAddress, routerAddress, baseTokenAddress);
        config.updateTokens(tokens);
        config.updateRaydium(raydiumAddress);
        config.updateNFTRewards(nftRewardsAddress);
        
        // Добавляем информацию о парах
        const pairInfo = {};
        pairs.forEach(pair => {
            pairInfo[`${pair.symbol}/BASE`] = pair.address;
        });
        config.updatePairs(pairInfo);
        
        console.log("✅ Configuration updated successfully");
        
        // === 8. ФИНАЛЬНЫЙ ОТЧЕТ ===
        console.log("\n📋 === DEPLOYMENT SUMMARY ===");
        console.log(`🌊 BASE Token: ${baseTokenAddress}`);
        console.log(`🏭 PancakeFactory: ${factoryAddress}`);
        console.log(`🔀 PancakeRouter: ${routerAddress}`);
        console.log(`🌈 Raydium: ${raydiumAddress}`);
        console.log(`🎨 NFT Rewards: ${nftRewardsAddress}`);
        
        console.log("\n💰 Token Ecosystem:");
        Object.entries(tokens).forEach(([symbol, address]) => {
            console.log(`   ${symbol.toUpperCase()}: ${address}`);
        });
        
        console.log("\n📊 Trading Pairs with Liquidity:");
        pairs.forEach(pair => {
            console.log(`   ${pair.symbol}/BASE: ${pair.address}`);
        });
        
        console.log("\n🎉 === CUSTOM TOKEN ECOSYSTEM DEPLOYED ===");
        console.log("\n💡 Next steps:");
        console.log("   1. Test token transfers and approvals");
        console.log("   2. Test trading on PancakeSwap");
        console.log("   3. Test NFT rewards system");
        console.log("   4. Add more liquidity if needed");
        
        return {
            baseToken: baseTokenAddress,
            factory: factoryAddress,
            router: routerAddress,
            raydium: raydiumAddress,
            nftRewards: nftRewardsAddress,
            tokens,
            pairs: pairInfo
        };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// Функция для тестирования токенов
async function testTokenEcosystem() {
    console.log("🧪 === TESTING TOKEN ECOSYSTEM ===\n");
    
    const [deployer, user1] = await ethers.getSigners();
    
    // Получаем адреса из конфигурации
    const baseTokenAddress = config.pancakeswap.wneon; // BASE токен хранится как wneon
    const usdcAddress = config.tokens.usdc;
    const routerAddress = config.pancakeswap.router;
    
    const baseToken = await ethers.getContractAt("BaseToken", baseTokenAddress);
    const usdcToken = await ethers.getContractAt("BaseToken", usdcAddress);
    const router = await ethers.getContractAt("PancakeRouter", routerAddress);
    
    console.log("🔄 Testing token transfers...");
    
    // Transfer BASE tokens to user1
    const transferAmount = ethers.parseEther("100");
    await baseToken.transfer(user1.address, transferAmount);
    
    const user1Balance = await baseToken.balanceOf(user1.address);
    console.log(`✅ User1 BASE balance: ${ethers.formatEther(user1Balance)}`);
    
    console.log("\n🔄 Testing token swaps...");
    
    // Swap BASE for USDC
    const swapAmount = ethers.parseEther("10");
    const path = [baseTokenAddress, usdcAddress];
    
    // Get expected output
    const amountsOut = await router.getAmountsOut(swapAmount, path);
    console.log(`Expected USDC output: ${ethers.formatUnits(amountsOut[1], 6)}`);
    
    // Perform swap
    await baseToken.connect(user1).approve(routerAddress, swapAmount);
    await router.connect(user1).swapExactTokensForTokens(
        swapAmount,
        0, // Accept any amount
        path,
        user1.address,
        Math.floor(Date.now() / 1000) + 3600
    );
    
    const user1UsdcBalance = await usdcToken.balanceOf(user1.address);
    console.log(`✅ User1 USDC balance after swap: ${ethers.formatUnits(user1UsdcBalance, 6)}`);
    
    console.log("\n🎉 Token ecosystem test completed!");
}

// Экспорт функций
module.exports = {
    deployOwnTokens,
    testTokenEcosystem
};

// Запуск, если файл вызван напрямую
if (require.main === module) {
    deployOwnTokens()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 