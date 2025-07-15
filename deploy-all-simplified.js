const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function deployAllSimplified() {
    console.log("🚀 === DEPLOYING ALL CONTRACTS (SIMPLIFIED VERSION) ===\n");

    try {
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

        // === 1. DEPLOY PANCAKESWAP ===
        console.log("🥞 === STEP 1: DEPLOYING PANCAKESWAP ===");
        
        // Deploy WNEON
        const WNEONFactory = await ethers.getContractFactory("WNEON");
        const wneon = await WNEONFactory.deploy();
        await wneon.waitForDeployment();
        const wneonAddress = await wneon.getAddress();
        console.log(`✅ WNEON deployed: ${wneonAddress}`);

        // Deploy PancakeFactory
        const PancakeFactory = await ethers.getContractFactory("PancakeFactory");
        const factory = await PancakeFactory.deploy(deployer.address);
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();
        console.log(`✅ PancakeFactory deployed: ${factoryAddress}`);

        // Deploy PancakeRouter
        const PancakeRouter = await ethers.getContractFactory("PancakeRouter");
        const router = await PancakeRouter.deploy(factoryAddress, wneonAddress);
        await router.waitForDeployment();
        const routerAddress = await router.getAddress();
        console.log(`✅ PancakeRouter deployed: ${routerAddress}`);

        // Update config
        config.updatePancakeSwap(factoryAddress, routerAddress, wneonAddress);

        // === 2. DEPLOY MOCK TOKENS ===
        console.log("\n💰 === STEP 2: DEPLOYING MOCK TOKENS ===");
        
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        const tokens = {};
        
        const tokenConfigs = [
            { name: "USD Coin", symbol: "USDC", supply: "1000000" },
            { name: "Tether USD", symbol: "USDT", supply: "1000000" },
            { name: "Bitcoin", symbol: "BTC", supply: "21000" },
            { name: "Ethereum", symbol: "ETH", supply: "120000000" }
        ];

        for (const tokenConfig of tokenConfigs) {
            const token = await MockERC20Factory.deploy(
                tokenConfig.name,
                tokenConfig.symbol,
                ethers.parseEther(tokenConfig.supply)
            );
            await token.waitForDeployment();
            const tokenAddress = await token.getAddress();
            tokens[tokenConfig.symbol] = tokenAddress;
            console.log(`✅ ${tokenConfig.symbol} deployed: ${tokenAddress}`);
        }

        // Update config
        config.updateTokens(tokens);

        // === 3. DEPLOY RAYDIUM ===
        console.log("\n⚡ === STEP 3: DEPLOYING RAYDIUM ===");
        
        const RaydiumFactory = await ethers.getContractFactory("RaydiumSwapContract");
        const raydium = await RaydiumFactory.deploy();
        await raydium.waitForDeployment();
        const raydiumAddress = await raydium.getAddress();
        console.log(`✅ Raydium deployed: ${raydiumAddress}`);

        // Update config
        config.updateRaydium(raydiumAddress);

        // === 4. DEPLOY NFT REWARDS ===
        console.log("\n🎨 === STEP 4: DEPLOYING NFT REWARDS ===");
        
        const NFTRewardsFactory = await ethers.getContractFactory("NFTRewardsContract");
        const nftRewards = await NFTRewardsFactory.deploy();
        await nftRewards.waitForDeployment();
        const nftRewardsAddress = await nftRewards.getAddress();
        console.log(`✅ NFT Rewards deployed: ${nftRewardsAddress}`);

        // Update config
        config.updateNFT(nftRewardsAddress);

        // === 5. CREATE TRADING PAIRS ===
        console.log("\n🔗 === STEP 5: CREATING TRADING PAIRS ===");
        
        const pairs = {};
        const pairNames = ["USDC", "USDT", "BTC", "ETH"];
        
        for (const tokenSymbol of pairNames) {
            const tokenAddress = tokens[tokenSymbol];
            console.log(`Creating ${tokenSymbol}/WNEON pair...`);
            
            const tx = await factory.createPair(tokenAddress, wneonAddress);
            const receipt = await tx.wait();
            
            // Find PairCreated event
            const pairCreatedEvent = receipt.logs.find(log => {
                try {
                    const decoded = factory.interface.parseLog(log);
                    return decoded.name === "PairCreated";
                } catch (e) {
                    return false;
                }
            });
            
            if (pairCreatedEvent) {
                const decoded = factory.interface.parseLog(pairCreatedEvent);
                const pairAddress = decoded.args.pair;
                pairs[`${tokenSymbol}_WNEON`] = pairAddress;
                console.log(`✅ ${tokenSymbol}/WNEON pair created: ${pairAddress}`);
            }
        }

        // === 6. SETUP NFT REWARDS SYSTEM ===
        console.log("\n🎯 === STEP 6: SETTING UP NFT REWARDS SYSTEM ===");
        
        // Authorize PancakeRouter and Raydium as swap contracts
        console.log("🔐 Authorizing swap contracts...");
        const authRouter = await nftRewards.authorizeSwapContract(routerAddress, true);
        await authRouter.wait();
        console.log("✅ PancakeRouter authorized for NFT rewards");
        
        const authRaydium = await nftRewards.authorizeSwapContract(raydiumAddress, true);
        await authRaydium.wait();
        console.log("✅ Raydium authorized for NFT rewards");

        // === 7. TESTING NFT REWARDS SYSTEM ===
        console.log("\n🧪 === STEP 7: TESTING NFT REWARDS SYSTEM ===");
        
        // Authorize deployer for testing
        const authDeployer = await nftRewards.authorizeSwapContract(deployer.address, true);
        await authDeployer.wait();
        console.log("✅ Deployer authorized for testing");

        // Test volume-based NFT system
        console.log("\n💱 Testing volume-based NFT rewards...");
        
        // Test $1,200 volume (should trigger $1,000 NFT)
        const swapAmount1200 = ethers.parseEther("1200"); // $1,200
        const testTx1 = await nftRewards.recordSwapActivity(deployer.address, swapAmount1200);
        await testTx1.wait();
        
        // Check stats
        let userStats = await nftRewards.getUserStats(deployer.address);
        let volumeStats = await nftRewards.getUserVolumeStats(deployer.address);
        console.log(`📊 After $1,200 volume:`);
        console.log(`   Total Volume: $${volumeStats.volume}`);
        console.log(`   NFT $1000 Claimed: ${volumeStats.nft1000}`);
        console.log(`   Total NFTs: ${userStats.totalNFTs}`);
        
        // Test $4,000 more volume (total $5,200, should trigger $5,000 NFT)
        const swapAmount4000 = ethers.parseEther("4000"); // $4,000
        const testTx2 = await nftRewards.recordSwapActivity(deployer.address, swapAmount4000);
        await testTx2.wait();
        
        // Check stats again
        userStats = await nftRewards.getUserStats(deployer.address);
        volumeStats = await nftRewards.getUserVolumeStats(deployer.address);
        console.log(`📊 After $5,200 total volume:`);
        console.log(`   Total Volume: $${volumeStats.volume}`);
        console.log(`   NFT $1000 Claimed: ${volumeStats.nft1000}`);
        console.log(`   NFT $5000 Claimed: ${volumeStats.nft5000}`);
        console.log(`   Total NFTs: ${userStats.totalNFTs}`);
        
        // Test $5,000 more volume (total $10,200, should trigger $10,000 NFT)
        const swapAmount5000 = ethers.parseEther("5000"); // $5,000
        const testTx3 = await nftRewards.recordSwapActivity(deployer.address, swapAmount5000);
        await testTx3.wait();
        
        // Check final stats
        userStats = await nftRewards.getUserStats(deployer.address);
        volumeStats = await nftRewards.getUserVolumeStats(deployer.address);
        console.log(`📊 After $10,200 total volume:`);
        console.log(`   Total Volume: $${volumeStats.volume}`);
        console.log(`   NFT $1000 Claimed: ${volumeStats.nft1000}`);
        console.log(`   NFT $5000 Claimed: ${volumeStats.nft5000}`);
        console.log(`   NFT $10000 Claimed: ${volumeStats.nft10000}`);
        console.log(`   Total NFTs: ${userStats.totalNFTs}`);

        // Display all NFTs
        const userNFTs = await nftRewards.getUserNFTs(deployer.address);
        console.log(`\n🎨 User NFTs (${userNFTs.length} total):`);
        for (let i = 0; i < userNFTs.length; i++) {
            const nftInfo = await nftRewards.getNFTInfo(userNFTs[i]);
            const rarityNames = ['Common', 'Rare', 'Epic', 'Legendary'];
            console.log(`   NFT #${userNFTs[i]}: ${nftInfo.description} (${rarityNames[nftInfo.rarity]})`);
        }

        // === 8. DEPLOYMENT SUMMARY ===
        console.log("\n📋 === DEPLOYMENT SUMMARY ===");
        console.log(`🥞 PancakeSwap:`);
        console.log(`   Factory: ${factoryAddress}`);
        console.log(`   Router: ${routerAddress}`);
        console.log(`   WNEON: ${wneonAddress}`);
        
        console.log(`\n💰 Mock Tokens:`);
        for (const [symbol, address] of Object.entries(tokens)) {
            console.log(`   ${symbol}: ${address}`);
        }
        
        console.log(`\n⚡ Raydium: ${raydiumAddress}`);
        console.log(`🎨 NFT Rewards: ${nftRewardsAddress}`);
        
        console.log(`\n🔗 Trading Pairs:`);
        for (const [name, address] of Object.entries(pairs)) {
            console.log(`   ${name}: ${address}`);
        }

        console.log(`\n🎯 NFT Rewards Features:`);
        console.log(`   ✅ Volume-based NFT system active`);
        console.log(`   ✅ $1,000 volume → Common NFT`);
        console.log(`   ✅ $5,000 volume → Rare NFT`);
        console.log(`   ✅ $10,000 volume → Epic NFT`);
        console.log(`   ✅ PancakeRouter & Raydium authorized`);

        console.log("\n🎉 === ALL DEPLOYMENTS COMPLETED SUCCESSFULLY! ===");
        
        return {
            pancakeswap: {
                factory: factoryAddress,
                router: routerAddress,
                wneon: wneonAddress
            },
            tokens: tokens,
            raydium: raydiumAddress,
            nftRewards: nftRewardsAddress,
            pairs: pairs
        };

    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    deployAllSimplified()
        .then(() => {
            console.log("\n✅ All deployments completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = deployAllSimplified; 