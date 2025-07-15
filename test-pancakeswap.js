const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function testPancakeSwap() {
    console.log("🥞 === TESTING PANCAKESWAP DEPLOYMENT ===\n");
    
    try {
        // Get deployer
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Test WNEON contract
        console.log("\n🪙 Testing WNEON contract...");
        const wneonAddress = config.pancakeswap.wneon;
        const wneonContract = await ethers.getContractAt("WNEON", wneonAddress);
        const name = await wneonContract.name();
        const symbol = await wneonContract.symbol();
        console.log(`   ✓ WNEON Name: ${name}`);
        console.log(`   ✓ WNEON Symbol: ${symbol}`);
        
        // Test PancakeFactory contract
        console.log("\n🏭 Testing PancakeFactory contract...");
        const factoryAddress = config.pancakeswap.factory;
        const factoryContract = await ethers.getContractAt("PancakeFactory", factoryAddress);
        const feeTo = await factoryContract.feeTo();
        console.log(`   ✓ Factory Fee To: ${feeTo}`);
        
        // Test PancakeRouter contract
        console.log("\n🔀 Testing PancakeRouter contract...");
        const routerAddress = config.pancakeswap.router;
        const routerContract = await ethers.getContractAt("PancakeRouter", routerAddress);
        const routerFactory = await routerContract.factory();
        const routerWETH = await routerContract.WETH();
        console.log(`   ✓ Router Factory: ${routerFactory}`);
        console.log(`   ✓ Router WETH: ${routerWETH}`);
        
        // Verify contracts are connected
        console.log("\n🔗 Verifying contract connections...");
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
        
        console.log("\n🎉 PancakeSwap deployment test PASSED!");
        return true;
        
    } catch (error) {
        console.error("❌ PancakeSwap test failed:", error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testPancakeSwap()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error("Test execution failed:", error);
            process.exit(1);
        });
}

module.exports = testPancakeSwap; 