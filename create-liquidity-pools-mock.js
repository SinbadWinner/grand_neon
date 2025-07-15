const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function createLiquidityPoolsMock() {
    console.log("🏊 === CREATING LIQUIDITY POOLS (MOCK) ===\n");
    
    try {
        // Get deployer
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Get contracts
        const factoryContract = await ethers.getContractAt("PancakeFactory", config.pancakeswap.factory);
        const routerContract = await ethers.getContractAt("PancakeRouter", config.pancakeswap.router);
        const wneonContract = await ethers.getContractAt("WNEON", config.pancakeswap.wneon);
        
        // Check if tokens are deployed
        if (!config.tokens.usdc || !config.tokens.usdt || !config.tokens.btc || !config.tokens.eth) {
            throw new Error("Tokens not deployed. Please run deploy-tokens-mock.js first.");
        }
        
        // Get token contracts
        const usdcContract = await ethers.getContractAt("MockERC20", config.tokens.usdc);
        const usdtContract = await ethers.getContractAt("MockERC20", config.tokens.usdt);
        const btcContract = await ethers.getContractAt("MockERC20", config.tokens.btc);
        const ethContract = await ethers.getContractAt("MockERC20", config.tokens.eth);
        
        // Mint additional tokens for liquidity if needed
        console.log("\n💰 Minting additional tokens for liquidity...");
        const additionalSupply = ethers.parseEther("100000"); // 100k tokens
        
        // Mint additional tokens
        await usdcContract.mintTokens(additionalSupply);
        await usdtContract.mintTokens(additionalSupply);
        await btcContract.mintTokens(additionalSupply);
        await ethContract.mintTokens(additionalSupply);
        
        console.log("   ✓ Additional tokens minted");
        
        // Wrap some ETH to WNEON for liquidity
        console.log("\n🌊 Wrapping ETH to WNEON...");
        const wrapAmount = ethers.parseEther("100"); // Reduced from 1000 to 100
        await wneonContract.deposit({ value: wrapAmount });
        console.log(`   ✓ Wrapped ${ethers.formatEther(wrapAmount)} ETH to WNEON`);
        
        console.log("\n🔄 Creating liquidity pools...");
        
        // Create USDC/WNEON pool
        console.log("\n💎 Creating USDC/WNEON pool...");
        const usdcAmount = ethers.parseEther("1000"); // Reduced from 100k to 1k
        const wneonAmount1 = ethers.parseEther("10"); // Reduced from 1000 to 10
        
        await usdcContract.approve(config.pancakeswap.router, usdcAmount);
        await wneonContract.approve(config.pancakeswap.router, wneonAmount1);
        
        await routerContract.addLiquidity(
            config.tokens.usdc,
            config.pancakeswap.wneon,
            usdcAmount,
            wneonAmount1,
            0, // min amounts
            0,
            deployer.address,
            Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
        );
        console.log("   ✓ USDC/WNEON pool created");
        
        // Create USDT/WNEON pool
        console.log("\n💎 Creating USDT/WNEON pool...");
        const usdtAmount = ethers.parseEther("1000"); // Reduced from 100k to 1k
        const wneonAmount2 = ethers.parseEther("10"); // Reduced from 1000 to 10
        
        await usdtContract.approve(config.pancakeswap.router, usdtAmount);
        await wneonContract.approve(config.pancakeswap.router, wneonAmount2);
        
        await routerContract.addLiquidity(
            config.tokens.usdt,
            config.pancakeswap.wneon,
            usdtAmount,
            wneonAmount2,
            0, // min amounts
            0,
            deployer.address,
            Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
        );
        console.log("   ✓ USDT/WNEON pool created");
        
        // Create BTC/WNEON pool
        console.log("\n💎 Creating BTC/WNEON pool...");
        const btcAmount = ethers.parseEther("1"); // Reduced from 100 to 1
        const wneonAmount3 = ethers.parseEther("50"); // Reduced from 5000 to 50
        
        await btcContract.approve(config.pancakeswap.router, btcAmount);
        await wneonContract.approve(config.pancakeswap.router, wneonAmount3);
        
        await routerContract.addLiquidity(
            config.tokens.btc,
            config.pancakeswap.wneon,
            btcAmount,
            wneonAmount3,
            0, // min amounts
            0,
            deployer.address,
            Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
        );
        console.log("   ✓ BTC/WNEON pool created");
        
        // Create ETH/WNEON pool
        console.log("\n💎 Creating ETH/WNEON pool...");
        const ethAmount = ethers.parseEther("10"); // Reduced from 1000 to 10
        const wneonAmount4 = ethers.parseEther("20"); // Reduced from 2000 to 20
        
        await ethContract.approve(config.pancakeswap.router, ethAmount);
        await wneonContract.approve(config.pancakeswap.router, wneonAmount4);
        
        await routerContract.addLiquidity(
            config.tokens.eth,
            config.pancakeswap.wneon,
            ethAmount,
            wneonAmount4,
            0, // min amounts
            0,
            deployer.address,
            Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
        );
        console.log("   ✓ ETH/WNEON pool created");
        
        console.log("\n📝 Liquidity pools summary:");
        console.log("   ✓ USDC/WNEON pool - 1k USDC / 10 WNEON");
        console.log("   ✓ USDT/WNEON pool - 1k USDT / 10 WNEON");
        console.log("   ✓ BTC/WNEON pool - 1 BTC / 50 WNEON");
        console.log("   ✓ ETH/WNEON pool - 10 ETH / 20 WNEON");
        
        console.log("\n🎉 Mock liquidity pools creation COMPLETED!");
        return true;
        
    } catch (error) {
        console.error("❌ Mock liquidity pools creation failed:", error.message);
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    createLiquidityPoolsMock()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Creation failed:", error);
            process.exit(1);
        });
}

module.exports = createLiquidityPoolsMock; 