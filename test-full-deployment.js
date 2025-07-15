const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function testFullDeployment() {
    console.log("🧪 === TESTING FULL DEPLOYMENT ===\n");
    
    try {
        // Get deployer
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        let allTestsPassed = true;
        
        // Test 1: PancakeSwap contracts
        console.log("\n🥞 Testing PancakeSwap contracts...");
        try {
            const factoryContract = await ethers.getContractAt("PancakeFactory", config.pancakeswap.factory);
            const routerContract = await ethers.getContractAt("PancakeRouter", config.pancakeswap.router);
            const wneonContract = await ethers.getContractAt("WNEON", config.pancakeswap.wneon);
            
            const feeTo = await factoryContract.feeTo();
            const routerFactory = await routerContract.factory();
            const wneonName = await wneonContract.name();
            
            console.log(`   ✓ Factory fee to: ${feeTo}`);
            console.log(`   ✓ Router factory: ${routerFactory}`);
            console.log(`   ✓ WNEON name: ${wneonName}`);
            console.log("   ✅ PancakeSwap contracts OK");
        } catch (error) {
            console.log(`   ❌ PancakeSwap test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test 2: Tokens
        console.log("\n🪙 Testing ERC20ForSpl tokens...");
        try {
            if (!config.tokens.usdc || !config.tokens.usdt || !config.tokens.btc || !config.tokens.eth) {
                throw new Error("Tokens not deployed");
            }
            
            const usdcContract = await ethers.getContractAt("ERC20ForSplMintable", config.tokens.usdc);
            const usdtContract = await ethers.getContractAt("ERC20ForSplMintable", config.tokens.usdt);
            const btcContract = await ethers.getContractAt("ERC20ForSplMintable", config.tokens.btc);
            const ethContract = await ethers.getContractAt("ERC20ForSplMintable", config.tokens.eth);
            
            console.log(`   ✓ USDC: ${await usdcContract.name()} (${await usdcContract.symbol()})`);
            console.log(`   ✓ USDT: ${await usdtContract.name()} (${await usdtContract.symbol()})`);
            console.log(`   ✓ BTC: ${await btcContract.name()} (${await btcContract.symbol()})`);
            console.log(`   ✓ ETH: ${await ethContract.name()} (${await ethContract.symbol()})`);
            console.log("   ✅ Tokens OK");
        } catch (error) {
            console.log(`   ❌ Tokens test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test 3: Raydium contracts
        console.log("\n🚀 Testing Raydium contracts...");
        try {
            if (!config.raydium.swapContract) {
                throw new Error("Raydium contracts not deployed");
            }
            
            const raydiumContract = await ethers.getContractAt("RaydiumSwapContract", config.raydium.swapContract);
            const owner = await raydiumContract.owner();
            
            console.log(`   ✓ RaydiumSwapContract owner: ${owner}`);
            console.log("   ✅ Raydium contracts OK");
        } catch (error) {
            console.log(`   ❌ Raydium test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test 4: NFT Rewards
        console.log("\n🏆 Testing NFT Rewards contracts...");
        try {
            if (!config.nft.rewardsContract) {
                throw new Error("NFT Rewards contracts not deployed");
            }
            
            const nftContract = await ethers.getContractAt("NFTRewardsContract", config.nft.rewardsContract);
            const owner = await nftContract.owner();
            const name = await nftContract.name();
            const symbol = await nftContract.symbol();
            
            console.log(`   ✓ NFT owner: ${owner}`);
            console.log(`   ✓ NFT name: ${name}`);
            console.log(`   ✓ NFT symbol: ${symbol}`);
            console.log("   ✅ NFT Rewards contracts OK");
        } catch (error) {
            console.log(`   ❌ NFT Rewards test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test 5: Liquidity pools
        console.log("\n🏊 Testing liquidity pools...");
        try {
            const factoryContract = await ethers.getContractAt("PancakeFactory", config.pancakeswap.factory);
            
            // Check if pools exist
            const usdcWneonPair = await factoryContract.getPair(config.tokens.usdc, config.pancakeswap.wneon);
            const usdtWneonPair = await factoryContract.getPair(config.tokens.usdt, config.pancakeswap.wneon);
            const btcWneonPair = await factoryContract.getPair(config.tokens.btc, config.pancakeswap.wneon);
            const ethWneonPair = await factoryContract.getPair(config.tokens.eth, config.pancakeswap.wneon);
            
            console.log(`   ✓ USDC/WNEON pair: ${usdcWneonPair}`);
            console.log(`   ✓ USDT/WNEON pair: ${usdtWneonPair}`);
            console.log(`   ✓ BTC/WNEON pair: ${btcWneonPair}`);
            console.log(`   ✓ ETH/WNEON pair: ${ethWneonPair}`);
            console.log("   ✅ Liquidity pools OK");
        } catch (error) {
            console.log(`   ❌ Liquidity pools test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Final result
        console.log("\n📊 === TEST RESULTS ===");
        if (allTestsPassed) {
            console.log("🎉 ALL TESTS PASSED!");
            console.log("✅ System is fully deployed and working");
        } else {
            console.log("❌ Some tests failed");
            console.log("🔧 Please check the logs above for details");
        }
        
        console.log("\n🚀 Available commands:");
        console.log("   npm run deploy         - Full deployment");
        console.log("   npm run deploy:tokens  - Deploy tokens only");
        console.log("   npm run deploy:raydium - Deploy Raydium only");
        console.log("   npm run deploy:nft     - Deploy NFT only");
        console.log("   npm run deploy:pools   - Create pools only");
        console.log("   npm run test:pancakeswap - Test PancakeSwap");
        
        return allTestsPassed;
        
    } catch (error) {
        console.error("❌ Full deployment test failed:", error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testFullDeployment()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error("Test execution failed:", error);
            process.exit(1);
        });
}

module.exports = testFullDeployment; 