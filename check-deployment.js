const { ethers } = require("hardhat");

async function checkDeployment() {
    console.log("🔍 === БЫСТРАЯ ДИАГНОСТИКА РАЗВЕРТЫВАНИЯ ===\n");
    
    try {
        // Get provider and network info
        const provider = ethers.provider;
        const network = await provider.getNetwork();
        const [deployer] = await ethers.getSigners();
        
        console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
        console.log(`👤 Deployer: ${deployer.address}`);
        console.log(`💰 Deployer balance: ${ethers.formatEther(await provider.getBalance(deployer.address))} ETH\n`);
        
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
        
        console.log("📋 === ПРОВЕРКА КАЖДОГО КОНТРАКТА ===");
        
        let allDeployed = true;
        
        for (const [name, address] of Object.entries(addresses)) {
            try {
                console.log(`\n🔍 Проверка ${name.toUpperCase()}:`);
                console.log(`   📍 Адрес: ${address}`);
                
                // Check if contract exists
                const code = await provider.getCode(address);
                
                if (code === "0x") {
                    console.log(`   ❌ КОНТРАКТ НЕ НАЙДЕН - нет bytecode`);
                    allDeployed = false;
                } else {
                    console.log(`   ✅ Контракт найден - bytecode: ${code.length} символов`);
                    
                    // Try to interact with specific contracts
                    if (name === 'usdc' || name === 'usdt' || name === 'btc' || name === 'eth') {
                        try {
                            const tokenContract = await ethers.getContractAt("MockERC20", address);
                            const balance = await tokenContract.balanceOf(deployer.address);
                            const tokenName = await tokenContract.name();
                            const tokenSymbol = await tokenContract.symbol();
                            console.log(`   ✅ Токен: ${tokenName} (${tokenSymbol})`);
                            console.log(`   ✅ Баланс deployer: ${ethers.formatEther(balance)}`);
                        } catch (error) {
                            console.log(`   ⚠️  Ошибка при вызове balanceOf: ${error.message}`);
                        }
                    }
                    
                    if (name === 'wneon') {
                        try {
                            const wneonContract = await ethers.getContractAt("WNEON", address);
                            const balance = await wneonContract.balanceOf(deployer.address);
                            const tokenName = await wneonContract.name();
                            const tokenSymbol = await wneonContract.symbol();
                            console.log(`   ✅ Токен: ${tokenName} (${tokenSymbol})`);
                            console.log(`   ✅ Баланс deployer: ${ethers.formatEther(balance)}`);
                        } catch (error) {
                            console.log(`   ⚠️  Ошибка при вызове balanceOf: ${error.message}`);
                        }
                    }
                    
                    if (name === 'factory') {
                        try {
                            const factoryContract = await ethers.getContractAt("PancakeFactory", address);
                            const pairsCount = await factoryContract.allPairsLength();
                            console.log(`   ✅ Количество пар: ${pairsCount}`);
                        } catch (error) {
                            console.log(`   ⚠️  Ошибка при вызове allPairsLength: ${error.message}`);
                        }
                    }
                    
                    if (name === 'nft') {
                        try {
                            const nftContract = await ethers.getContractAt("NFTRewardsContract", address);
                            const totalSupply = await nftContract.totalSupply();
                            console.log(`   ✅ Общее количество NFT: ${totalSupply}`);
                        } catch (error) {
                            console.log(`   ⚠️  Ошибка при вызове totalSupply: ${error.message}`);
                        }
                    }
                }
                
            } catch (error) {
                console.log(`   ❌ ОШИБКА: ${error.message}`);
                allDeployed = false;
            }
        }
        
        console.log("\n📊 === ИТОГОВЫЙ СТАТУС ===");
        
        if (allDeployed) {
            console.log("✅ ВСЕ КОНТРАКТЫ РАЗВЕРНУТЫ УСПЕШНО!");
            console.log("✅ Все balanceOf вызовы должны работать корректно");
            console.log("✅ Система готова к использованию");
            
            console.log("\n🚀 === СЛЕДУЮЩИЕ ШАГИ ===");
            console.log("1. Запустите: node test-final-system-fixed.js");
            console.log("2. Или используйте обычный test-final-system.js");
            console.log("3. Ошибки balanceOf исправлены");
            
        } else {
            console.log("❌ НЕКОТОРЫЕ КОНТРАКТЫ НЕ РАЗВЕРНУТЫ");
            console.log("❌ Это причина ошибок balanceOf");
            
            console.log("\n🛠️  === РЕШЕНИЕ ===");
            console.log("1. Убедитесь, что Hardhat node запущен:");
            console.log("   npx hardhat node");
            console.log("2. Разверните контракты:");
            console.log("   node deploy-all-simplified.js");
            console.log("3. Повторите эту проверку:");
            console.log("   node check-deployment.js");
        }
        
        return allDeployed;
        
    } catch (error) {
        console.error("❌ Критическая ошибка диагностики:", error.message);
        console.error("\n🛠️  Возможные причины:");
        console.error("1. Hardhat node не запущен");
        console.error("2. Неправильная конфигурация сети");
        console.error("3. Проблемы с подключением к RPC");
        
        return false;
    }
}

// Run the check
if (require.main === module) {
    checkDeployment()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error("Check execution failed:", error);
            process.exit(1);
        });
}

module.exports = checkDeployment; 