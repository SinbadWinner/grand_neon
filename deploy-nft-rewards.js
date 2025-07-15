const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function deployNFTRewards() {
    console.log("🎨 === DEPLOYING NFT REWARDS CONTRACT ===\n");

    try {
        // Получаем деплойера
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deploying with account: ${deployer.address}`);
        
        // Получаем баланс
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);

        // Компилируем контракт
        console.log("\n📝 Compiling NFTRewardsContract...");
        const NFTRewardsContract = await ethers.getContractFactory("NFTRewardsContract");

        // Развертываем контракт
        console.log("🚀 Deploying NFTRewardsContract...");
        const nftRewards = await NFTRewardsContract.deploy();
        await nftRewards.waitForDeployment();
        
        const nftRewardsAddress = await nftRewards.getAddress();
        console.log(`✅ NFTRewardsContract deployed to: ${nftRewardsAddress}`);

        // Проверяем базовую информацию
        console.log("\n📊 Checking contract info...");
        const name = await nftRewards.name();
        const symbol = await nftRewards.symbol();
        const owner = await nftRewards.owner();
        
        console.log(`📛 Token Name: ${name}`);
        console.log(`🔤 Token Symbol: ${symbol}`);
        console.log(`👑 Contract Owner: ${owner}`);

        // Проверяем глобальную статистику
        const globalStats = await nftRewards.getGlobalStats();
        console.log(`📈 Total NFTs minted: ${globalStats[0]}`);
        console.log(`📊 Common NFTs: ${globalStats[1]}`);
        console.log(`📊 Rare NFTs: ${globalStats[2]}`);
        console.log(`📊 Epic NFTs: ${globalStats[3]}`);
        console.log(`📊 Legendary NFTs: ${globalStats[4]}`);

        // Тестируем новую функциональность объема торгов
        console.log("\n🧪 Testing volume-based NFT system...");
        
        // Авторизуем деплойера как swap контракт для тестирования
        console.log("🔐 Authorizing deployer as swap contract...");
        const authTx = await nftRewards.authorizeSwapContract(deployer.address, true);
        await authTx.wait();
        
        // Проверяем авторизацию
        const isAuthorized = await nftRewards.authorizedSwapContracts(deployer.address);
        console.log(`✅ Deployer authorized: ${isAuthorized}`);

        // Записываем активность свапа на $500
        console.log("\n💱 Recording swap activity ($500)...");
        const swapAmount500 = ethers.parseEther("500"); // $500
        const recordTx1 = await nftRewards.recordSwapActivity(deployer.address, swapAmount500);
        await recordTx1.wait();
        
        // Проверяем статистику пользователя
        let userStats = await nftRewards.getUserStats(deployer.address);
        console.log(`📊 User Stats after $500 swap:`);
        console.log(`   Total Swaps: ${userStats.totalSwaps}`);
        console.log(`   Total Points: ${userStats.totalPoints}`);
        console.log(`   Total Volume USD: ${userStats.totalTradingVolumeUSD}`);
        console.log(`   Total NFTs: ${userStats.totalNFTs}`);

        // Записываем активность свапа на $700 (общий объем $1,200)
        console.log("\n💱 Recording swap activity ($700, total $1,200)...");
        const swapAmount700 = ethers.parseEther("700"); // $700
        const recordTx2 = await nftRewards.recordSwapActivity(deployer.address, swapAmount700);
        await recordTx2.wait();
        
        // Проверяем статистику после автоматического минта NFT за $1000
        userStats = await nftRewards.getUserStats(deployer.address);
        console.log(`📊 User Stats after $700 swap (total $1,200):`);
        console.log(`   Total Swaps: ${userStats.totalSwaps}`);
        console.log(`   Total Points: ${userStats.totalPoints}`);
        console.log(`   Total Volume USD: ${userStats.totalTradingVolumeUSD}`);
        console.log(`   Total NFTs: ${userStats.totalNFTs}`);

        // Проверяем статистику объема торгов
        const volumeStats = await nftRewards.getUserVolumeStats(deployer.address);
        console.log(`📊 Volume Stats:`);
        console.log(`   Total Volume: $${volumeStats.volume}`);
        console.log(`   NFT $1000 Claimed: ${volumeStats.nft1000}`);
        console.log(`   NFT $5000 Claimed: ${volumeStats.nft5000}`);
        console.log(`   NFT $10000 Claimed: ${volumeStats.nft10000}`);

        // Проверяем NFT пользователя
        const userNFTs = await nftRewards.getUserNFTs(deployer.address);
        console.log(`🎨 User NFTs: ${userNFTs.length} total`);
        
        if (userNFTs.length > 0) {
            for (let i = 0; i < userNFTs.length; i++) {
                const nftInfo = await nftRewards.getNFTInfo(userNFTs[i]);
                console.log(`   NFT #${userNFTs[i]}: ${nftInfo.description} (${['Common', 'Rare', 'Epic', 'Legendary'][nftInfo.rarity]})`);
            }
        }

        // Тестируем NFT за $5000
        console.log("\n💱 Recording large swap activity ($4,000 to reach $5,000)...");
        const swapAmount4000 = ethers.parseEther("4000"); // $4000
        const recordTx3 = await nftRewards.recordSwapActivity(deployer.address, swapAmount4000);
        await recordTx3.wait();
        
        // Проверяем статистику после NFT за $5000
        userStats = await nftRewards.getUserStats(deployer.address);
        const volumeStats2 = await nftRewards.getUserVolumeStats(deployer.address);
        console.log(`📊 Stats after $5,000 volume reached:`);
        console.log(`   Total Volume: $${volumeStats2.volume}`);
        console.log(`   NFT $5000 Claimed: ${volumeStats2.nft5000}`);
        console.log(`   Total NFTs: ${userStats.totalNFTs}`);

        // Проверяем обновленный список NFT
        const userNFTs2 = await nftRewards.getUserNFTs(deployer.address);
        console.log(`🎨 Updated User NFTs: ${userNFTs2.length} total`);
        
        if (userNFTs2.length > 0) {
            for (let i = 0; i < userNFTs2.length; i++) {
                const nftInfo = await nftRewards.getNFTInfo(userNFTs2[i]);
                console.log(`   NFT #${userNFTs2[i]}: ${nftInfo.description} (${['Common', 'Rare', 'Epic', 'Legendary'][nftInfo.rarity]})`);
            }
        }

        // Сохраняем адрес в конфигурацию
        console.log("\n💾 Saving NFT Rewards address to config...");
        config.updateNFT(nftRewardsAddress);
        
        console.log("\n🎉 NFT Rewards deployment completed successfully!");
        console.log(`📝 Contract Address: ${nftRewardsAddress}`);
        
        // Возвращаем информацию о контракте
        return {
            address: nftRewardsAddress,
            name: name,
            symbol: symbol,
            owner: owner,
            contract: nftRewards
        };

    } catch (error) {
        console.error("❌ NFT Rewards deployment failed:", error.message);
        throw error;
    }
}

// Запуск при прямом выполнении
if (require.main === module) {
    deployNFTRewards()
        .then((result) => {
            console.log("\n✅ Deployment successful!");
            console.log(`📄 Address: ${result.address}`);
            console.log(`📛 Name: ${result.name}`);
            console.log(`🔤 Symbol: ${result.symbol}`);
            process.exit(0);
        })
        .catch((error) => {
            console.error("Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = deployNFTRewards; 