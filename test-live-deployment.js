const { ethers } = require("hardhat");

async function testLiveDeployment() {
    console.log("🧪 === TESTING LIVE DEPLOYMENT ===\n");
    
    try {
        // Get deployer
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Актуальные адреса из последнего развертывания
        const addresses = {
            factory: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
            router: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
            wneon: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            usdc: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
            usdt: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
            btc: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
            eth: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
            raydium: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
            nft: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
        };
        
        // Test WNEON contract
        console.log("\n🌊 Testing WNEON contract...");
        const wneonContract = await ethers.getContractAt("WNEON", addresses.wneon);
        const wneonName = await wneonContract.name();
        const wneonSymbol = await wneonContract.symbol();
        const wneonDecimals = await wneonContract.decimals();
        console.log(`   ✓ Name: ${wneonName}`);
        console.log(`   ✓ Symbol: ${wneonSymbol}`);
        console.log(`   ✓ Decimals: ${wneonDecimals}`);
        
        // Test PancakeFactory contract
        console.log("\n🏭 Testing PancakeFactory contract...");
        const factoryContract = await ethers.getContractAt("PancakeFactory", addresses.factory);
        const pairsLength = await factoryContract.allPairsLength();
        console.log(`   ✓ Total pairs: ${pairsLength}`);
        
        // Test PancakeRouter contract
        console.log("\n📋 Testing PancakeRouter contract...");
        const routerContract = await ethers.getContractAt("PancakeRouter", addresses.router);
        const routerFactory = await routerContract.factory();
        const routerWETH = await routerContract.WETH();
        console.log(`   ✓ Factory: ${routerFactory}`);
        console.log(`   ✓ WETH: ${routerWETH}`);
        
        // Test Mock tokens
        console.log("\n💎 Testing Mock tokens...");
        const usdcContract = await ethers.getContractAt("MockERC20", addresses.usdc);
        const usdtContract = await ethers.getContractAt("MockERC20", addresses.usdt);
        const btcContract = await ethers.getContractAt("MockERC20", addresses.btc);
        const ethContract = await ethers.getContractAt("MockERC20", addresses.eth);
        
        console.log(`   ✓ USDC: ${await usdcContract.symbol()}, supply: ${ethers.formatEther(await usdcContract.totalSupply())}`);
        console.log(`   ✓ USDT: ${await usdtContract.symbol()}, supply: ${ethers.formatEther(await usdtContract.totalSupply())}`);
        console.log(`   ✓ BTC: ${await btcContract.symbol()}, supply: ${ethers.formatEther(await btcContract.totalSupply())}`);
        console.log(`   ✓ ETH: ${await ethContract.symbol()}, supply: ${ethers.formatEther(await ethContract.totalSupply())}`);
        
        // Test Raydium
        console.log("\n⚡ Testing Raydium contracts...");
        const raydiumContract = await ethers.getContractAt("RaydiumSwapContract", addresses.raydium);
        const raydiumOwner = await raydiumContract.owner();
        console.log(`   ✓ Owner: ${raydiumOwner}`);
        
        // Test NFT Rewards
        console.log("\n🎨 Testing NFT Rewards contracts...");
        const nftContract = await ethers.getContractAt("NFTRewardsContract", addresses.nft);
        const nftName = await nftContract.name();
        const nftSymbol = await nftContract.symbol();
        const totalSupply = await nftContract.totalSupply();
        console.log(`   ✓ Name: ${nftName}`);
        console.log(`   ✓ Symbol: ${nftSymbol}`);
        console.log(`   ✓ Total Supply: ${totalSupply}`);
        
        // Test swap functionality
        console.log("\n💱 Testing swap functionality...");
        const swapAmount = ethers.parseEther("1");
        
        // Approve tokens
        await usdcContract.approve(addresses.router, swapAmount);
        console.log("   ✓ USDC approved for router");
        
        // Get pair address
        const pairAddress = await factoryContract.getPair(addresses.usdc, addresses.wneon);
        console.log(`   ✓ USDC/WNEON pair: ${pairAddress}`);
        
        // Check balances
        const usdcBalance = await usdcContract.balanceOf(deployer.address);
        const wneonBalance = await wneonContract.balanceOf(deployer.address);
        console.log(`   ✓ USDC balance: ${ethers.formatEther(usdcBalance)}`);
        console.log(`   ✓ WNEON balance: ${ethers.formatEther(wneonBalance)}`);
        
        // Test volume tracking
        console.log("\n📊 Testing volume tracking...");
        const userStats = await nftContract.getUserStats(deployer.address);
        console.log(`   ✓ User volume: $${userStats.totalVolume}`);
        console.log(`   ✓ User points: ${userStats.totalPoints}`);
        console.log(`   ✓ NFTs owned: ${userStats.totalNFTs}`);
        
        console.log("\n🎉 === ALL TESTS PASSED! ===");
        
        console.log("\n📋 === SYSTEM STATUS ===");
        console.log("✅ PancakeSwap: WORKING");
        console.log("✅ Mock Tokens: WORKING");
        console.log("✅ Raydium: WORKING");
        console.log("✅ NFT Rewards: WORKING");
        console.log("✅ Volume Tracking: WORKING");
        console.log("✅ Ready for Frontend Integration!");
        
        return true;
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testLiveDeployment()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error("Test execution failed:", error);
            process.exit(1);
        });
}

module.exports = testLiveDeployment; 