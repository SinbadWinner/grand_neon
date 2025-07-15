const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function deployRaydium() {
    console.log("🚀 === DEPLOYING RAYDIUM CONTRACTS ===\n");
    
    try {
        // Get deployer
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Deploy RaydiumSwapContract
        console.log("\n💫 Deploying RaydiumSwapContract...");
        const RaydiumFactory = await ethers.getContractFactory("RaydiumSwapContract");
        const raydiumSwap = await RaydiumFactory.deploy();
        await raydiumSwap.waitForDeployment();
        
        const raydiumSwapAddress = await raydiumSwap.getAddress();
        console.log(`   ✓ RaydiumSwapContract deployed at: ${raydiumSwapAddress}`);
        
        // Test the contract
        console.log("\n🔍 Testing RaydiumSwapContract...");
        console.log(`   ✓ Contract deployed successfully`);
        console.log(`   ✓ Contract address: ${raydiumSwapAddress}`);
        
        // Update configuration
        config.updateRaydium({
            swapContract: raydiumSwapAddress
        });
        
        console.log("\n📝 Raydium deployment summary:");
        console.log(`   SwapContract: ${raydiumSwapAddress}`);
        console.log(`   Deployer: ${deployer.address}`);
        
        console.log("\n🎉 Raydium deployment COMPLETED!");
        return {
            swapContract: raydiumSwapAddress,
            deployer: deployer.address
        };
        
    } catch (error) {
        console.error("❌ Raydium deployment failed:", error.message);
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    deployRaydium()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = deployRaydium; 