const { ethers } = require("hardhat");

async function testSimpleSwap() {
    console.log("🧪 === TESTING SIMPLE SWAP ===\n");
    
    try {
        // Get signer
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Адреса контрактов
        const USDC_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
        const ROUTER_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
        const NFT_ADDRESS = "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6";
        
        // Получаем контракты
        const usdcContract = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
        const nftContract = await ethers.getContractAt("NFTRewardsContract", NFT_ADDRESS);
        
        // Проверяем базовые функции
        console.log("💰 Testing basic token functions...");
        
        const balance = await usdcContract.balanceOf(deployer.address);
        console.log(`   USDC Balance: ${ethers.formatEther(balance)}`);
        
        const totalSupply = await usdcContract.totalSupply();
        console.log(`   USDC Total Supply: ${ethers.formatEther(totalSupply)}`);
        
        const symbol = await usdcContract.symbol();
        console.log(`   USDC Symbol: ${symbol}`);
        
        // Проверяем NFT систему
        console.log("\n🎨 Testing NFT system...");
        
        const userStats = await nftContract.getUserStats(deployer.address);
        console.log(`   User Volume: $${userStats.totalVolume}`);
        console.log(`   User Points: ${userStats.totalPoints}`);
        console.log(`   User NFTs: ${userStats.totalNFTs}`);
        
        const totalNFTs = await nftContract.totalSupply();
        console.log(`   Total NFTs: ${totalNFTs}`);
        
        // Проверяем отдельные NFT
        if (totalNFTs > 0) {
            console.log("\n🎯 NFT Details:");
            for (let i = 0; i < Math.min(totalNFTs, 5); i++) {
                const tokenId = await nftContract.tokenByIndex(i);
                const owner = await nftContract.ownerOf(tokenId);
                const tokenURI = await nftContract.tokenURI(tokenId);
                console.log(`   NFT #${tokenId}: Owner ${owner.slice(0, 10)}...`);
            }
        }
        
        console.log("\n✅ === SIMPLE SWAP TEST COMPLETED ===");
        return true;
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        return false;
    }
}

// Run test
if (require.main === module) {
    testSimpleSwap()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error("Test execution failed:", error);
            process.exit(1);
        });
} 