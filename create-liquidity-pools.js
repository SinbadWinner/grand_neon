const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function createLiquidityPools() {
    console.log("🏊 === CREATING LIQUIDITY POOLS ===\n");
    
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
            throw new Error("Tokens not deployed. Please run deploy-tokens.js first.");
        }
        
        // Get token contracts
        const usdcContract = await ethers.getContractAt("ERC20ForSplMintable", config.tokens.usdc);
        const usdtContract = await ethers.getContractAt("ERC20ForSplMintable", config.tokens.usdt);
        const btcContract = await ethers.getContractAt("ERC20ForSplMintable", config.tokens.btc);
        const ethContract = await ethers.getContractAt("ERC20ForSplMintable", config.tokens.eth);
        
        // Mint tokens for liquidity
        console.log("\n💰 Minting tokens for liquidity...");
        const mintAmount = ethers.parseUnits("1000000", 18); // 1M tokens
        
        // Mint USDC (6 decimals)
        await usdcContract.mint(deployer.address, ethers.parseUnits("1000000", 6));
        console.log("   ✓ USDC minted");
        
        // Mint USDT (6 decimals)
        await usdtContract.mint(deployer.address, ethers.parseUnits("1000000", 6));
        console.log("   ✓ USDT minted");
        
        // Mint BTC (8 decimals)
        await btcContract.mint(deployer.address, ethers.parseUnits("1000", 8));
        console.log("   ✓ BTC minted");
        
        // Mint ETH (18 decimals)
        await ethContract.mint(deployer.address, ethers.parseUnits("10000", 18));
        console.log("   ✓ ETH minted");
        
        console.log("\n🔄 Creating liquidity pools...");
        
        // Create USDC/WNEON pool
        console.log("\n💎 Creating USDC/WNEON pool...");
        await usdcContract.approve(config.pancakeswap.router, ethers.parseUnits("100000", 6));
        await wneonContract.approve(config.pancakeswap.router, ethers.parseEther("1000"));
        
        await routerContract.addLiquidity(
            config.tokens.usdc,
            config.pancakeswap.wneon,
            ethers.parseUnits("100000", 6), // 100k USDC
            ethers.parseEther("1000"), // 1000 WNEON
            0, // min amounts
            0,
            deployer.address,
            Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
        );
        console.log("   ✓ USDC/WNEON pool created");
        
        // Create USDT/WNEON pool
        console.log("\n💎 Creating USDT/WNEON pool...");
        await usdtContract.approve(config.pancakeswap.router, ethers.parseUnits("100000", 6));
        
        await routerContract.addLiquidity(
            config.tokens.usdt,
            config.pancakeswap.wneon,
            ethers.parseUnits("100000", 6), // 100k USDT
            ethers.parseEther("1000"), // 1000 WNEON
            0, // min amounts
            0,
            deployer.address,
            Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
        );
        console.log("   ✓ USDT/WNEON pool created");
        
        // Create BTC/WNEON pool
        console.log("\n💎 Creating BTC/WNEON pool...");
        await btcContract.approve(config.pancakeswap.router, ethers.parseUnits("100", 8));
        
        await routerContract.addLiquidity(
            config.tokens.btc,
            config.pancakeswap.wneon,
            ethers.parseUnits("100", 8), // 100 BTC
            ethers.parseEther("5000"), // 5000 WNEON
            0, // min amounts
            0,
            deployer.address,
            Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
        );
        console.log("   ✓ BTC/WNEON pool created");
        
        // Create ETH/WNEON pool
        console.log("\n💎 Creating ETH/WNEON pool...");
        await ethContract.approve(config.pancakeswap.router, ethers.parseUnits("1000", 18));
        
        await routerContract.addLiquidity(
            config.tokens.eth,
            config.pancakeswap.wneon,
            ethers.parseUnits("1000", 18), // 1000 ETH
            ethers.parseEther("2000"), // 2000 WNEON
            0, // min amounts
            0,
            deployer.address,
            Math.floor(Date.now() / 1000) + 3600 // 1 hour deadline
        );
        console.log("   ✓ ETH/WNEON pool created");
        
        console.log("\n📝 Liquidity pools summary:");
        console.log("   ✓ USDC/WNEON pool - 100k USDC / 1000 WNEON");
        console.log("   ✓ USDT/WNEON pool - 100k USDT / 1000 WNEON");
        console.log("   ✓ BTC/WNEON pool - 100 BTC / 5000 WNEON");
        console.log("   ✓ ETH/WNEON pool - 1000 ETH / 2000 WNEON");
        
        console.log("\n🎉 Liquidity pools creation COMPLETED!");
        return true;
        
    } catch (error) {
        console.error("❌ Liquidity pools creation failed:", error.message);
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    createLiquidityPools()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Creation failed:", error);
            process.exit(1);
        });
}

module.exports = createLiquidityPools; 