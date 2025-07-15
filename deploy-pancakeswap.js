const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function deployPancakeSwap() {
    console.log("🥞 === DEPLOYING PANCAKESWAP CONTRACTS ===\n");
    
    try {
        // Get deployer
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Deploy WNEON
        console.log("\n🌊 Deploying WNEON...");
        const WNEONFactory = await ethers.getContractFactory("WNEON");
        const wneonContract = await WNEONFactory.deploy();
        await wneonContract.waitForDeployment();
        const wneonAddress = await wneonContract.getAddress();
        console.log(`   ✓ WNEON deployed at: ${wneonAddress}`);
        
        // Test WNEON deposit
        console.log("\n🔍 Testing WNEON deposit...");
        await wneonContract.deposit({ value: ethers.parseEther("1") });
        const balance = await wneonContract.balanceOf(deployer.address);
        console.log(`   ✓ WNEON balance: ${ethers.formatEther(balance)} WNEON`);
        
        // Deploy PancakeFactory
        console.log("\n🏭 Deploying PancakeFactory...");
        const FactoryFactory = await ethers.getContractFactory("PancakeFactory");
        const factoryContract = await FactoryFactory.deploy(deployer.address);
        await factoryContract.waitForDeployment();
        const factoryAddress = await factoryContract.getAddress();
        console.log(`   ✓ PancakeFactory deployed at: ${factoryAddress}`);
        
        // Deploy PancakeRouter
        console.log("\n🔀 Deploying PancakeRouter...");
        const RouterFactory = await ethers.getContractFactory("PancakeRouter");
        const routerContract = await RouterFactory.deploy(factoryAddress, wneonAddress);
        await routerContract.waitForDeployment();
        const routerAddress = await routerContract.getAddress();
        console.log(`   ✓ PancakeRouter deployed at: ${routerAddress}`);
        
        // Test connections
        console.log("\n🔗 Testing contract connections...");
        const routerFactory = await routerContract.factory();
        const routerWETH = await routerContract.WETH();
        
        console.log(`   ✓ Router factory: ${routerFactory}`);
        console.log(`   ✓ Router WETH: ${routerWETH}`);
        
        if (routerFactory.toLowerCase() === factoryAddress.toLowerCase()) {
            console.log("   ✅ Router correctly connected to Factory");
        } else {
            console.log("   ❌ Router not connected to Factory");
        }
        
        if (routerWETH.toLowerCase() === wneonAddress.toLowerCase()) {
            console.log("   ✅ Router correctly connected to WNEON");
        } else {
            console.log("   ❌ Router not connected to WNEON");
        }
        
        // Update configuration
        config.updatePancakeSwap({
            factory: factoryAddress,
            router: routerAddress,
            wneon: wneonAddress
        });
        
        console.log("\n📝 PancakeSwap deployment summary:");
        console.log(`   Factory: ${factoryAddress}`);
        console.log(`   Router: ${routerAddress}`);
        console.log(`   WNEON: ${wneonAddress}`);
        
        console.log("\n🎉 PancakeSwap deployment COMPLETED!");
        return {
            factory: factoryAddress,
            router: routerAddress,
            wneon: wneonAddress
        };
        
    } catch (error) {
        console.error("❌ PancakeSwap deployment failed:", error.message);
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    deployPancakeSwap()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = deployPancakeSwap; 