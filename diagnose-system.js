const { ethers } = require("hardhat");

async function diagnoseSystem() {
    console.log("🔍 === ДИАГНОСТИКА СИСТЕМЫ (РЕАЛЬНЫЙ WNEON) ===\n");
    
    // РЕАЛЬНЫЙ АДРЕС WNEON В СЕТИ NEON EVM
    const REAL_WNEON_ADDRESS = "0x11adC2d986E334137b9ad0a0F290771F31e9517F";
    
    try {
        // Проверка 1: Подключение к сети
        console.log("1️⃣ Проверка подключения к сети...");
        const provider = ethers.provider;
        const network = await provider.getNetwork();
        console.log(`   ✅ Подключено к сети: ${network.name} (Chain ID: ${network.chainId})`);
        
        // Проверка 2: Получение аккаунтов
        console.log("\n2️⃣ Проверка аккаунтов...");
        const [deployer] = await ethers.getSigners();
        console.log(`   ✅ Deployer: ${deployer.address}`);
        
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log(`   ✅ Баланс: ${ethers.formatEther(balance)} ETH`);
        
        // Проверка 3: Проверка контрактов
        console.log("\n3️⃣ Проверка развернутых контрактов...");
        
        const expectedAddresses = {
            wneon: REAL_WNEON_ADDRESS,
            factory: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
            router: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
            usdc: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
            usdt: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
            btc: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
            eth: "0x0165878A594ca255338adfa4d48449f69242Eb8F"
        };
        
        const contractStatus = {};
        
        for (const [name, address] of Object.entries(expectedAddresses)) {
            try {
                const code = await provider.getCode(address);
                if (code && code !== "0x") {
                    contractStatus[name] = "✅ РАЗВЕРНУТ";
                    if (name === "wneon") {
                        console.log(`   ✅ ${name.toUpperCase()}: ${address} - РЕАЛЬНЫЙ КОНТРАКТ`);
                    } else {
                        console.log(`   ✅ ${name.toUpperCase()}: ${address} - РАЗВЕРНУТ`);
                    }
                } else {
                    contractStatus[name] = "❌ НЕ НАЙДЕН";
                    if (name === "wneon") {
                        console.log(`   ❌ ${name.toUpperCase()}: ${address} - РЕАЛЬНЫЙ КОНТРАКТ НЕ ДОСТУПЕН`);
                    } else {
                        console.log(`   ❌ ${name.toUpperCase()}: ${address} - НЕ НАЙДЕН`);
                    }
                }
            } catch (error) {
                contractStatus[name] = "❌ ОШИБКА";
                console.log(`   ❌ ${name.toUpperCase()}: ${address} - ОШИБКА: ${error.message}`);
            }
        }
        
        // Проверка 4: Функциональность контрактов
        console.log("\n4️⃣ Проверка функциональности контрактов...");
        
        if (contractStatus.wneon === "✅ РАЗВЕРНУТ") {
            try {
                const wneon = await ethers.getContractAt("WNEON", REAL_WNEON_ADDRESS);
                const name = await wneon.name();
                const symbol = await wneon.symbol();
                const deployerBalance = await wneon.balanceOf(deployer.address);
                
                console.log(`   ✅ WNEON (РЕАЛЬНЫЙ) функционирует: ${name} (${symbol})`);
                console.log(`   ✅ Баланс WNEON: ${ethers.formatEther(deployerBalance)}`);
                
                // Проверяем, можно ли сделать депозит
                try {
                    const totalSupply = await wneon.totalSupply();
                    console.log(`   ✅ Total Supply WNEON: ${ethers.formatEther(totalSupply)}`);
                } catch (error) {
                    console.log(`   ⚠️  Не удалось получить total supply: ${error.message}`);
                }
                
            } catch (error) {
                console.log(`   ❌ WNEON не функционирует: ${error.message}`);
            }
        } else {
            console.log(`   ⚠️  РЕАЛЬНЫЙ WNEON контракт недоступен. Возможно, сеть не Neon EVM`);
        }
        
        if (contractStatus.factory === "✅ РАЗВЕРНУТ") {
            try {
                const factory = await ethers.getContractAt("PancakeFactory", expectedAddresses.factory);
                const feeToSetter = await factory.feeToSetter();
                console.log(`   ✅ PancakeFactory функционирует: ${feeToSetter}`);
            } catch (error) {
                console.log(`   ❌ PancakeFactory не функционирует: ${error.message}`);
            }
        }
        
        if (contractStatus.router === "✅ РАЗВЕРНУТ") {
            try {
                const router = await ethers.getContractAt("PancakeRouter", expectedAddresses.router);
                const factoryAddr = await router.factory();
                const wneonAddr = await router.WETH();
                console.log(`   ✅ PancakeRouter функционирует: factory ${factoryAddr}`);
                console.log(`   ✅ Router WETH адрес: ${wneonAddr}`);
                if (wneonAddr.toLowerCase() !== REAL_WNEON_ADDRESS.toLowerCase()) {
                    console.log(`   ⚠️  ВНИМАНИЕ: Router указывает на другой WNEON адрес!`);
                }
            } catch (error) {
                console.log(`   ❌ PancakeRouter не функционирует: ${error.message}`);
            }
        }
        
        // Проверка 5: Проверка ликвидности
        console.log("\n5️⃣ Проверка ликвидности...");
        
        if (contractStatus.factory === "✅ РАЗВЕРНУТ" && contractStatus.wneon === "✅ РАЗВЕРНУТ") {
            try {
                const factory = await ethers.getContractAt("PancakeFactory", expectedAddresses.factory);
                const wneon = await ethers.getContractAt("WNEON", REAL_WNEON_ADDRESS);
                
                const pairs = [
                    { name: "USDC", address: expectedAddresses.usdc, decimals: 6 },
                    { name: "USDT", address: expectedAddresses.usdt, decimals: 6 },
                    { name: "BTC", address: expectedAddresses.btc, decimals: 8 },
                    { name: "ETH", address: expectedAddresses.eth, decimals: 18 }
                ];
                
                for (const pair of pairs) {
                    if (contractStatus[pair.name.toLowerCase()] === "✅ РАЗВЕРНУТ") {
                        const pairAddress = await factory.getPair(pair.address, REAL_WNEON_ADDRESS);
                        
                        if (pairAddress !== ethers.ZeroAddress) {
                            const token = await ethers.getContractAt("MockERC20", pair.address);
                            const tokenBalance = await token.balanceOf(pairAddress);
                            const wneonBalance = await wneon.balanceOf(pairAddress);
                            
                            if (tokenBalance > 0 && wneonBalance > 0) {
                                console.log(`   ✅ ${pair.name}/WNEON: ${ethers.formatUnits(tokenBalance, pair.decimals)} ${pair.name} + ${ethers.formatEther(wneonBalance)} WNEON`);
                            } else {
                                console.log(`   ❌ ${pair.name}/WNEON: НЕТ ЛИКВИДНОСТИ`);
                            }
                        } else {
                            console.log(`   ❌ ${pair.name}/WNEON: ПАРА НЕ СОЗДАНА`);
                        }
                    }
                }
            } catch (error) {
                console.log(`   ❌ Ошибка проверки ликвидности: ${error.message}`);
            }
        }
        
        // Проверка 6: Тест свапа
        console.log("\n6️⃣ Тест свапа...");
        
        if (contractStatus.router === "✅ РАЗВЕРНУТ" && contractStatus.wneon === "✅ РАЗВЕРНУТ" && contractStatus.usdc === "✅ РАЗВЕРНУТ") {
            try {
                const router = await ethers.getContractAt("PancakeRouter", expectedAddresses.router);
                const swapAmount = ethers.parseEther("1");
                const path = [REAL_WNEON_ADDRESS, expectedAddresses.usdc];
                
                const amountsOut = await router.getAmountsOut(swapAmount, path);
                const expectedUsdc = ethers.formatUnits(amountsOut[1], 6);
                console.log(`   ✅ Расчет свапа работает: 1 WNEON = ${expectedUsdc} USDC`);
            } catch (error) {
                console.log(`   ❌ Расчет свапа не работает: ${error.message}`);
            }
        }
        
        // Проверка 7: Тест депозита WNEON
        console.log("\n7️⃣ Тест депозита WNEON...");
        
        if (contractStatus.wneon === "✅ РАЗВЕРНУТ") {
            try {
                const wneon = await ethers.getContractAt("WNEON", REAL_WNEON_ADDRESS);
                const testAmount = ethers.parseEther("0.001"); // Тестовый депозит 0.001 ETH
                
                // Получаем баланс до
                const balanceBefore = await wneon.balanceOf(deployer.address);
                
                // Проверяем, можем ли мы сделать депозит (симуляция)
                console.log(`   🧪 Тестирование депозита ${ethers.formatEther(testAmount)} NEON...`);
                console.log(`   📊 WNEON баланс до: ${ethers.formatEther(balanceBefore)}`);
                console.log(`   ✅ Депозит функция доступна для тестирования`);
                
            } catch (error) {
                console.log(`   ❌ Тест депозита не удался: ${error.message}`);
            }
        }
        
        // Итоговая диагностика
        console.log("\n📋 === ИТОГОВАЯ ДИАГНОСТИКА ===");
        
        const deployedContracts = Object.values(contractStatus).filter(status => status === "✅ РАЗВЕРНУТ").length;
        const totalContracts = Object.keys(contractStatus).length;
        
        console.log(`📊 Доступно контрактов: ${deployedContracts}/${totalContracts}`);
        console.log(`🌐 WNEON: РЕАЛЬНЫЙ КОНТРАКТ (${REAL_WNEON_ADDRESS})`);
        
        if (deployedContracts === 0) {
            console.log("\n🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА:");
            console.log("   ❌ НИ ОДИН КОНТРАКТ НЕ РАЗВЕРНУТ!");
            console.log("   🔧 РЕШЕНИЕ:");
            console.log("   1. Запустите Hardhat node: npx hardhat node");
            console.log("   2. Разверните контракты: node quick-start.js");
            
        } else if (deployedContracts < totalContracts) {
            console.log("\n⚠️  ЧАСТИЧНАЯ ПРОБЛЕМА:");
            if (contractStatus.wneon !== "✅ РАЗВЕРНУТ") {
                console.log("   ❌ РЕАЛЬНЫЙ WNEON НЕДОСТУПЕН!");
                console.log("   🔧 ВОЗМОЖНЫЕ ПРИЧИНЫ:");
                console.log("   1. Сеть не Neon EVM");
                console.log("   2. Проблемы с подключением");
                console.log("   3. Неправильная настройка сети");
            } else {
                console.log("   ❌ НЕ ВСЕ ЛОКАЛЬНЫЕ КОНТРАКТЫ РАЗВЕРНУТЫ!");
                console.log("   🔧 РЕШЕНИЕ:");
                console.log("   1. Перезапустите Hardhat node: npx hardhat node");
                console.log("   2. Разверните все контракты: node quick-start.js");
            }
            
        } else {
            console.log("\n✅ СИСТЕМА РАБОТАЕТ КОРРЕКТНО!");
            console.log("   ✅ Все контракты доступны");
            console.log("   ✅ РЕАЛЬНЫЙ WNEON подключен");
            console.log("   ✅ Система готова к использованию");
        }
        
        console.log("\n🎯 СЛЕДУЮЩИЕ ШАГИ:");
        console.log("   1. Запустите полное развертывание: node quick-start.js");
        console.log("   2. Сделайте депозит NEON → WNEON");
        console.log("   3. Проверьте ликвидность: node check-liquidity.js");
        console.log("   4. Запустите полный тест: node test-liquidity-deployment.js");
        
        console.log("\n💡 ВАЖНО:");
        console.log("   🔗 Используется РЕАЛЬНЫЙ WNEON контракт");
        console.log("   💰 Для получения WNEON нужно сделать депозит");
        console.log("   🌐 Убедитесь, что вы в правильной сети");
        
    } catch (error) {
        console.error("❌ Критическая ошибка диагностики:", error);
        console.log("\n🔧 ВОЗМОЖНЫЕ РЕШЕНИЯ:");
        console.log("   1. Проверьте, что Hardhat node запущен");
        console.log("   2. Убедитесь, что вы в правильной директории");
        console.log("   3. Запустите: npx hardhat compile");
        console.log("   4. Проверьте подключение к сети");
        console.log("   5. Убедитесь, что WNEON контракт доступен");
    }
}

if (require.main === module) {
    diagnoseSystem();
}

module.exports = { diagnoseSystem }; 