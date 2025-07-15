const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function deployTokens() {
    console.log("🪙 === DEPLOYING ERC20ForSPL TOKENS ===\n");
    
    try {
        // Get deployer
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Deploy test tokens
        const tokens = {};
        
        // USDC Token
        console.log("\n💎 Deploying USDC token...");
        const USDCFactory = await ethers.getContractFactory("ERC20ForSplMintable");
        const usdcToken = await USDCFactory.deploy("USD Coin", "USDC", 6, deployer.address);
        await usdcToken.waitForDeployment();
        tokens.usdc = await usdcToken.getAddress();
        console.log(`   ✓ USDC deployed at: ${tokens.usdc}`);
        
        // USDT Token
        console.log("\n💎 Deploying USDT token...");
        const USDTFactory = await ethers.getContractFactory("ERC20ForSplMintable");
        const usdtToken = await USDTFactory.deploy("Tether USD", "USDT", 6, deployer.address);
        await usdtToken.waitForDeployment();
        tokens.usdt = await usdtToken.getAddress();
        console.log(`   ✓ USDT deployed at: ${tokens.usdt}`);
        
        // BTC Token
        console.log("\n💎 Deploying BTC token...");
        const BTCFactory = await ethers.getContractFactory("ERC20ForSplMintable");
        const btcToken = await BTCFactory.deploy("Bitcoin", "BTC", 8, deployer.address);
        await btcToken.waitForDeployment();
        tokens.btc = await btcToken.getAddress();
        console.log(`   ✓ BTC deployed at: ${tokens.btc}`);
        
        // ETH Token
        console.log("\n💎 Deploying ETH token...");
        const ETHFactory = await ethers.getContractFactory("ERC20ForSplMintable");
        const ethToken = await ETHFactory.deploy("Ethereum", "ETH", 18, deployer.address);
        await ethToken.waitForDeployment();
        tokens.eth = await ethToken.getAddress();
        console.log(`   ✓ ETH deployed at: ${tokens.eth}`);
        
        // Update configuration
        config.updateTokens({
            usdc: tokens.usdc,
            usdt: tokens.usdt,
            btc: tokens.btc,
            eth: tokens.eth
        });
        
        console.log("\n📝 Token deployment summary:");
        console.log(`   USDC: ${tokens.usdc}`);
        console.log(`   USDT: ${tokens.usdt}`);
        console.log(`   BTC: ${tokens.btc}`);
        console.log(`   ETH: ${tokens.eth}`);
        
        console.log("\n🎉 Token deployment COMPLETED!");
        return tokens;
        
    } catch (error) {
        console.error("❌ Token deployment failed:", error.message);
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    deployTokens()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = deployTokens; 