const { ethers } = require("hardhat");

async function checkContractDeployment(provider, address, name) {
    console.log(`🔍 Checking ${name} at ${address}...`);
    
    // Check if address is valid
    if (!address || address === ethers.ZeroAddress) {
        throw new Error(`${name} address is invalid: ${address}`);
    }
    
    // Check if contract exists
    const code = await provider.getCode(address);
    if (code === "0x") {
        throw new Error(`${name} contract not found at ${address} - no bytecode`);
    }
    
    console.log(`   ✅ ${name} contract found - bytecode length: ${code.length}`);
    return true;
}

async function testFinalSystemFixed() {
    console.log("🎯 === FIXED FINAL SYSTEM TEST - ПОЛНАЯ ПРОВЕРКА С ДИАГНОСТИКОЙ ===\n");
    
    try {
        // Get signers and provider
        const [deployer, user1, user2] = await ethers.getSigners();
        const provider = ethers.provider;
        
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`👤 User1: ${user1.address}`);
        console.log(`👤 User2: ${user2.address}`);
        console.log(`🌐 Network: ${await provider.getNetwork().then(n => n.name)}`);
        
        // Contract addresses from latest deployment
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
        
        console.log("\n🔄 === STEP 1: ПРОВЕРКА РАЗВЕРТЫВАНИЯ КОНТРАКТОВ ===");
        
        // Check all contracts are deployed
        await checkContractDeployment(provider, addresses.factory, "PancakeFactory");
        await checkContractDeployment(provider, addresses.router, "PancakeRouter");
        await checkContractDeployment(provider, addresses.wneon, "WNEON");
        await checkContractDeployment(provider, addresses.usdc, "USDC");
        await checkContractDeployment(provider, addresses.usdt, "USDT");
        await checkContractDeployment(provider, addresses.btc, "BTC");
        await checkContractDeployment(provider, addresses.eth, "ETH");
        await checkContractDeployment(provider, addresses.raydium, "Raydium");
        await checkContractDeployment(provider, addresses.nft, "NFT");
        
        console.log("\n✅ === ВСЕ КОНТРАКТЫ РАЗВЕРНУТЫ И ГОТОВЫ К РАБОТЕ ===");
        
        // Get contracts with try-catch for additional safety
        console.log("\n🔗 === STEP 2: ПОДКЛЮЧЕНИЕ К КОНТРАКТАМ ===");
        
        let routerContract, factoryContract, usdcContract, wneonContract, nftContract, raydiumContract;
        
        try {
            routerContract = await ethers.getContractAt("PancakeRouter", addresses.router);
            console.log("   ✅ PancakeRouter connected");
        } catch (error) {
            throw new Error(`Failed to connect to PancakeRouter: ${error.message}`);
        }
        
        try {
            factoryContract = await ethers.getContractAt("PancakeFactory", addresses.factory);
            console.log("   ✅ PancakeFactory connected");
        } catch (error) {
            throw new Error(`Failed to connect to PancakeFactory: ${error.message}`);
        }
        
        try {
            usdcContract = await ethers.getContractAt("MockERC20", addresses.usdc);
            console.log("   ✅ USDC MockERC20 connected");
        } catch (error) {
            throw new Error(`Failed to connect to USDC: ${error.message}`);
        }
        
        try {
            wneonContract = await ethers.getContractAt("WNEON", addresses.wneon);
            console.log("   ✅ WNEON connected");
        } catch (error) {
            throw new Error(`Failed to connect to WNEON: ${error.message}`);
        }
        
        try {
            nftContract = await ethers.getContractAt("NFTRewardsContract", addresses.nft);
            console.log("   ✅ NFTRewardsContract connected");
        } catch (error) {
            throw new Error(`Failed to connect to NFTRewardsContract: ${error.message}`);
        }
        
        try {
            raydiumContract = await ethers.getContractAt("RaydiumSwapContract", addresses.raydium);
            console.log("   ✅ RaydiumSwapContract connected");
        } catch (error) {
            throw new Error(`Failed to connect to RaydiumSwapContract: ${error.message}`);
        }
        
        console.log("\n💰 === STEP 3: ПРОВЕРКА БАЛАНСОВ (БЕЗОПАСНО) ===");
        
        // Check initial balances with error handling
        try {
            const initialUSDC = await usdcContract.balanceOf(deployer.address);
            const initialWNEON = await wneonContract.balanceOf(deployer.address);
            console.log(`   ✅ Initial USDC: ${ethers.formatEther(initialUSDC)}`);
            console.log(`   ✅ Initial WNEON: ${ethers.formatEther(initialWNEON)}`);
        } catch (error) {
            console.error(`   ❌ Error checking balances: ${error.message}`);
            throw error;
        }
        
        // Check trading pairs
        console.log("\n📊 === STEP 4: ПРОВЕРКА ТОРГОВЫХ ПАР ===");
        
        try {
            const usdcWneonPair = await factoryContract.getPair(addresses.usdc, addresses.wneon);
            console.log(`   ✅ USDC/WNEON pair: ${usdcWneonPair}`);
            
            if (usdcWneonPair !== ethers.ZeroAddress) {
                await checkContractDeployment(provider, usdcWneonPair, "USDC/WNEON Pair");
            }
        } catch (error) {
            console.error(`   ❌ Error checking pairs: ${error.message}`);
            throw error;
        }
        
        console.log("\n💱 === STEP 5: ТЕСТИРОВАНИЕ СВАПОВ ===");
        
        // Transfer tokens to user1 for testing
        const testAmount = ethers.parseEther("1000");
        try {
            await usdcContract.transfer(user1.address, testAmount);
            console.log(`   ✅ Transferred 1000 USDC to User1`);
        } catch (error) {
            console.error(`   ❌ Error transferring USDC: ${error.message}`);
            throw error;
        }
        
        // User1 makes a swap
        const swapAmount = ethers.parseEther("100");
        try {
            await usdcContract.connect(user1).approve(addresses.router, swapAmount);
            console.log(`   ✅ User1 approved 100 USDC for swap`);
            
            // Get amounts out before swap
            const path = [addresses.usdc, addresses.wneon];
            const amountsOut = await routerContract.getAmountsOut(swapAmount, path);
            console.log(`   ✅ Expected WNEON output: ${ethers.formatEther(amountsOut[1])}`);
            
            // Execute swap
            const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes
            await routerContract.connect(user1).swapExactTokensForTokens(
                swapAmount,
                0, // Accept any amount of WNEON
                path,
                user1.address,
                deadline
            );
            console.log(`   ✅ User1 successfully swapped 100 USDC for WNEON`);
            
            // Check balances after swap
            const user1USDC = await usdcContract.balanceOf(user1.address);
            const user1WNEON = await wneonContract.balanceOf(user1.address);
            console.log(`   ✅ User1 USDC after swap: ${ethers.formatEther(user1USDC)}`);
            console.log(`   ✅ User1 WNEON after swap: ${ethers.formatEther(user1WNEON)}`);
            
        } catch (error) {
            console.error(`   ❌ Error during swap: ${error.message}`);
            throw error;
        }
        
        console.log("\n🎨 === STEP 6: ТЕСТИРОВАНИЕ NFT СИСТЕМЫ ===");
        
        try {
            // Record trading activity for NFT rewards
            const volumeAmount = 1200; // $1,200 to trigger first NFT
            await nftContract.recordTradingActivity(user1.address, volumeAmount, 10);
            console.log(`   ✅ Recorded $${volumeAmount} trading volume for User1`);
            
            // Check user stats
            const user1Stats = await nftContract.getUserStats(user1.address);
            console.log(`   ✅ User1 total volume: $${user1Stats.totalVolume}`);
            console.log(`   ✅ User1 total points: ${user1Stats.totalPoints}`);
            console.log(`   ✅ User1 total NFTs: ${user1Stats.totalNFTs}`);
            
            // Check if NFT was minted
            const totalNFTs = await nftContract.totalSupply();
            console.log(`   ✅ Total NFTs in system: ${totalNFTs}`);
            
        } catch (error) {
            console.error(`   ❌ Error in NFT system: ${error.message}`);
            throw error;
        }
        
        console.log("\n📊 === ДИАГНОСТИКА ЗАВЕРШЕНА УСПЕШНО ===");
        console.log("✅ Все контракты развернуты и имеют bytecode");
        console.log("✅ Все balanceOf вызовы работают корректно");
        console.log("✅ Торговые пары созданы и функционируют");
        console.log("✅ NFT система работает");
        console.log("✅ Система полностью готова к работе");
        
        console.log("\n🚀 === СЛЕДУЮЩИЕ ШАГИ ===");
        console.log("1. Система проверена и готова к использованию");
        console.log("2. Все ошибки balanceOf исправлены");
        console.log("3. Можно безопасно подключать фронтенд");
        console.log("4. Пользователи могут начинать торговлю");
        
        return true;
        
    } catch (error) {
        console.error("❌ Diagnostic test failed:", error.message);
        console.error("📋 Error details:", error);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testFinalSystemFixed()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error("Test execution failed:", error);
            process.exit(1);
        });
}

module.exports = testFinalSystemFixed; 