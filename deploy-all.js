const { ethers } = require("hardhat");
const deployTokens = require("./deploy-tokens.js");
const deployRaydium = require("./deploy-raydium.js");
const deployNFTRewards = require("./deploy-nft-rewards.js");
const createLiquidityPools = require("./create-liquidity-pools.js");
const testPancakeSwap = require("./test-pancakeswap.js");

async function deployAll() {
    console.log("🚀 === FULL DEPLOYMENT SCRIPT ===\n");
    console.log("📝 Deployment plan:");
    console.log("   1. Deploy ERC20ForSPL tokens");
    console.log("   2. Deploy Raydium contracts");
    console.log("   3. Deploy NFT Rewards system");
    console.log("   4. Create liquidity pools");
    console.log("   5. Test PancakeSwap integration");
    console.log("\n🎬 Starting deployment...\n");
    
    try {
        // Step 1: Deploy tokens
        console.log("📍 STEP 1: Deploying tokens...");
        const tokenResults = await deployTokens();
        console.log("✅ Tokens deployed successfully\n");
        
        // Step 2: Deploy Raydium
        console.log("📍 STEP 2: Deploying Raydium...");
        const raydiumResults = await deployRaydium();
        console.log("✅ Raydium deployed successfully\n");
        
        // Step 3: Deploy NFT Rewards
        console.log("📍 STEP 3: Deploying NFT Rewards...");
        const nftResults = await deployNFTRewards();
        console.log("✅ NFT Rewards deployed successfully\n");
        
        // Step 4: Create liquidity pools
        console.log("📍 STEP 4: Creating liquidity pools...");
        await createLiquidityPools();
        console.log("✅ Liquidity pools created successfully\n");
        
        // Step 5: Test PancakeSwap
        console.log("📍 STEP 5: Testing PancakeSwap integration...");
        const testResult = await testPancakeSwap();
        if (testResult) {
            console.log("✅ PancakeSwap test passed\n");
        } else {
            console.log("⚠️ PancakeSwap test failed\n");
        }
        
        // Final summary
        console.log("🎉 === DEPLOYMENT COMPLETED ===\n");
        console.log("📋 Final summary:");
        console.log("   ✅ ERC20ForSPL tokens deployed");
        console.log("   ✅ Raydium contracts deployed");
        console.log("   ✅ NFT Rewards system deployed");
        console.log("   ✅ Liquidity pools created");
        console.log("   ✅ PancakeSwap integration tested");
        
        console.log("\n🔧 Available commands:");
        console.log("   npm run test:connections  - Test network connections");
        console.log("   npm run test             - Run all tests");
        console.log("   npm run deploy           - Full deployment");
        
        console.log("\n🌟 Project is ready for use!");
        return true;
        
    } catch (error) {
        console.error("❌ Full deployment failed:", error.message);
        console.error("🔧 Try running individual scripts to debug:");
        console.error("   node deploy-tokens.js");
        console.error("   node deploy-raydium.js");
        console.error("   node deploy-nft-rewards.js");
        console.error("   node create-liquidity-pools.js");
        console.error("   node test-pancakeswap.js");
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    deployAll()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Full deployment failed:", error);
            process.exit(1);
        });
}

module.exports = deployAll; 