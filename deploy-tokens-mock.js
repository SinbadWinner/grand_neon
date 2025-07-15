const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function deployTokensMock() {
    console.log("🪙 === DEPLOYING MOCK ERC20 TOKENS ===\n");
    
    try {
        // Get deployer
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Deploy test tokens
        const tokens = {};
        const initialSupply = ethers.parseEther("1000000"); // 1M tokens
        
        // USDC Token
        console.log("\n💎 Deploying USDC token...");
        const USDCFactory = await ethers.getContractFactory("MockERC20");
        const usdcToken = await USDCFactory.deploy("USD Coin", "USDC", initialSupply);
        await usdcToken.waitForDeployment();
        tokens.usdc = await usdcToken.getAddress();
        console.log(`   ✓ USDC deployed at: ${tokens.usdc}`);
        
        // USDT Token
        console.log("\n💎 Deploying USDT token...");
        const USDTFactory = await ethers.getContractFactory("MockERC20");
        const usdtToken = await USDTFactory.deploy("Tether USD", "USDT", initialSupply);
        await usdtToken.waitForDeployment();
        tokens.usdt = await usdtToken.getAddress();
        console.log(`   ✓ USDT deployed at: ${tokens.usdt}`);
        
        // BTC Token
        console.log("\n💎 Deploying BTC token...");
        const BTCFactory = await ethers.getContractFactory("MockERC20");
        const btcToken = await BTCFactory.deploy("Bitcoin", "BTC", initialSupply);
        await btcToken.waitForDeployment();
        tokens.btc = await btcToken.getAddress();
        console.log(`   ✓ BTC deployed at: ${tokens.btc}`);
        
        // ETH Token
        console.log("\n💎 Deploying ETH token...");
        const ETHFactory = await ethers.getContractFactory("MockERC20");
        const ethToken = await ETHFactory.deploy("Ethereum", "ETH", initialSupply);
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
        
        // Test the tokens
        console.log("\n🔍 Testing token functionality...");
        const usdcBalance = await usdcToken.balanceOf(deployer.address);
        const usdtBalance = await usdtToken.balanceOf(deployer.address);
        const btcBalance = await btcToken.balanceOf(deployer.address);
        const ethBalance = await ethToken.balanceOf(deployer.address);
        
        console.log(`   ✓ USDC Balance: ${ethers.formatEther(usdcBalance)}`);
        console.log(`   ✓ USDT Balance: ${ethers.formatEther(usdtBalance)}`);
        console.log(`   ✓ BTC Balance: ${ethers.formatEther(btcBalance)}`);
        console.log(`   ✓ ETH Balance: ${ethers.formatEther(ethBalance)}`);
        
        console.log("\n🎉 Mock token deployment COMPLETED!");
        return tokens;
        
    } catch (error) {
        console.error("❌ Mock token deployment failed:", error.message);
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    deployTokensMock()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = deployTokensMock; 