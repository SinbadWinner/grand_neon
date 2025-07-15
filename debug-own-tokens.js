const { ethers } = require("hardhat");
const config = require("./dapp-config.js");

async function debugOwnTokens() {
    console.log("🔍 === DEBUGGING OWN TOKENS APPROACH ===\n");
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // === 1. DEPLOY BASE TOKEN ===
        console.log("\n🌊 === STEP 1: DEPLOYING BASE TOKEN ===");
        const BaseTokenFactory = await ethers.getContractFactory("BaseToken");
        const baseToken = await BaseTokenFactory.deploy(
            "Platform Base Token",
            "BASE",
            ethers.parseEther("10000000"),
            18
        );
        await baseToken.waitForDeployment();
        const baseTokenAddress = await baseToken.getAddress();
        console.log(`✅ BASE deployed: ${baseTokenAddress}`);
        
        // Тест BASE токена
        const baseName = await baseToken.name();
        const baseSymbol = await baseToken.symbol();
        const baseBalance = await baseToken.balanceOf(deployer.address);
        console.log(`   📋 Name: ${baseName}`);
        console.log(`   📋 Symbol: ${baseSymbol}`);
        console.log(`   📊 Balance: ${ethers.formatEther(baseBalance)}`);
        
        // === 2. DEPLOY USDC TOKEN ===
        console.log("\n💰 === STEP 2: DEPLOYING USDC TOKEN ===");
        const usdcToken = await BaseTokenFactory.deploy(
            "USD Coin",
            "USDC",
            ethers.parseUnits("1000000", 6),
            6
        );
        await usdcToken.waitForDeployment();
        const usdcTokenAddress = await usdcToken.getAddress();
        console.log(`✅ USDC deployed: ${usdcTokenAddress}`);
        
        // Тест USDC токена
        const usdcName = await usdcToken.name();
        const usdcSymbol = await usdcToken.symbol();
        const usdcBalance = await usdcToken.balanceOf(deployer.address);
        const usdcDecimals = await usdcToken.decimals();
        console.log(`   📋 Name: ${usdcName}`);
        console.log(`   📋 Symbol: ${usdcSymbol}`);
        console.log(`   📋 Decimals: ${usdcDecimals}`);
        console.log(`   📊 Balance: ${ethers.formatUnits(usdcBalance, 6)}`);
        
        // === 3. DEPLOY PANCAKESWAP ===
        console.log("\n🥞 === STEP 3: DEPLOYING PANCAKESWAP ===");
        
        // Deploy PancakeFactory
        const PancakeFactory = await ethers.getContractFactory("PancakeFactory");
        const factory = await PancakeFactory.deploy(deployer.address);
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();
        console.log(`✅ PancakeFactory deployed: ${factoryAddress}`);
        
        // Deploy PancakeRouter
        const PancakeRouter = await ethers.getContractFactory("PancakeRouter");
        const router = await PancakeRouter.deploy(factoryAddress, baseTokenAddress);
        await router.waitForDeployment();
        const routerAddress = await router.getAddress();
        console.log(`✅ PancakeRouter deployed: ${routerAddress}`);
        
        // Тест соединения
        const routerFactory = await router.factory();
        const routerWETH = await router.WETH();
        console.log(`   📋 Router factory: ${routerFactory}`);
        console.log(`   📋 Router WETH: ${routerWETH}`);
        console.log(`   ✅ Router properly connected to BASE token`);
        
        // === 4. CREATE PAIR ===
        console.log("\n🔄 === STEP 4: CREATING USDC/BASE PAIR ===");
        
        console.log(`Creating pair for:`);
        console.log(`   USDC: ${usdcTokenAddress}`);
        console.log(`   BASE: ${baseTokenAddress}`);
        
        const createPairTx = await factory.createPair(usdcTokenAddress, baseTokenAddress);
        await createPairTx.wait();
        
        const pairAddress = await factory.getPair(usdcTokenAddress, baseTokenAddress);
        console.log(`✅ USDC/BASE pair created: ${pairAddress}`);
        
        // Проверяем что pair контракт существует
        const pairCode = await ethers.provider.getCode(pairAddress);
        console.log(`   📋 Pair contract code length: ${pairCode.length}`);
        
        if (pairCode === '0x') {
            throw new Error("Pair contract was not created properly");
        }
        
        // === 5. PREPARE LIQUIDITY ===
        console.log("\n🏊 === STEP 5: PREPARING LIQUIDITY ===");
        
        const baseAmount = ethers.parseEther("1000");
        const usdcAmount = ethers.parseUnits("1000", 6);
        
        console.log(`BASE amount: ${ethers.formatEther(baseAmount)}`);
        console.log(`USDC amount: ${ethers.formatUnits(usdcAmount, 6)}`);
        
        // Проверим балансы
        const baseBalanceBefore = await baseToken.balanceOf(deployer.address);
        const usdcBalanceBefore = await usdcToken.balanceOf(deployer.address);
        
        console.log(`   📊 BASE balance before: ${ethers.formatEther(baseBalanceBefore)}`);
        console.log(`   📊 USDC balance before: ${ethers.formatUnits(usdcBalanceBefore, 6)}`);
        
        // === 6. APPROVE TOKENS ===
        console.log("\n✅ === STEP 6: APPROVING TOKENS ===");
        
        console.log(`Approving BASE tokens to router...`);
        const baseApproveTx = await baseToken.approve(routerAddress, baseAmount);
        await baseApproveTx.wait();
        
        console.log(`Approving USDC tokens to router...`);
        const usdcApproveTx = await usdcToken.approve(routerAddress, usdcAmount);
        await usdcApproveTx.wait();
        
        // Проверим allowance
        const baseAllowance = await baseToken.allowance(deployer.address, routerAddress);
        const usdcAllowance = await usdcToken.allowance(deployer.address, routerAddress);
        
        console.log(`   📊 BASE allowance: ${ethers.formatEther(baseAllowance)}`);
        console.log(`   📊 USDC allowance: ${ethers.formatUnits(usdcAllowance, 6)}`);
        
        // === 7. ADD LIQUIDITY ===
        console.log("\n💧 === STEP 7: ADDING LIQUIDITY ===");
        
        // Проверим, что все контракты существуют
        const routerCode = await ethers.provider.getCode(routerAddress);
        const factoryCode = await ethers.provider.getCode(factoryAddress);
        const baseCode = await ethers.provider.getCode(baseTokenAddress);
        const usdcCode = await ethers.provider.getCode(usdcTokenAddress);
        
        console.log(`   📋 Router code length: ${routerCode.length}`);
        console.log(`   📋 Factory code length: ${factoryCode.length}`);
        console.log(`   📋 BASE code length: ${baseCode.length}`);
        console.log(`   📋 USDC code length: ${usdcCode.length}`);
        
        if (routerCode === '0x' || factoryCode === '0x' || baseCode === '0x' || usdcCode === '0x') {
            throw new Error("One of the contracts is not deployed properly");
        }
        
        console.log(`Adding liquidity...`);
        console.log(`   Token A: ${usdcTokenAddress} (${ethers.formatUnits(usdcAmount, 6)} USDC)`);
        console.log(`   Token B: ${baseTokenAddress} (${ethers.formatEther(baseAmount)} BASE)`);
        
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        
        try {
            const addLiquidityTx = await router.addLiquidity(
                usdcTokenAddress,
                baseTokenAddress,
                usdcAmount,
                baseAmount,
                0, // min amounts
                0,
                deployer.address,
                deadline
            );
            
            const receipt = await addLiquidityTx.wait();
            console.log(`✅ Liquidity added successfully!`);
            console.log(`   📋 Transaction hash: ${receipt.hash}`);
            console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
            
        } catch (error) {
            console.log(`❌ addLiquidity failed: ${error.message}`);
            
            // Дополнительная диагностика
            console.log("\n🔍 === ADDITIONAL DIAGNOSTICS ===");
            
            // Проверим функции контрактов
            try {
                const routerContract = await ethers.getContractAt("PancakeRouter", routerAddress);
                const factoryFromRouter = await routerContract.factory();
                console.log(`   📋 Factory from router: ${factoryFromRouter}`);
                
                const wethFromRouter = await routerContract.WETH();
                console.log(`   📋 WETH from router: ${wethFromRouter}`);
                
                // Проверим pair еще раз
                const pairFromFactory = await factory.getPair(usdcTokenAddress, baseTokenAddress);
                console.log(`   📋 Pair from factory: ${pairFromFactory}`);
                
            } catch (diagError) {
                console.log(`   ❌ Diagnostic error: ${diagError.message}`);
            }
            
            throw error;
        }
        
        console.log("\n🎉 === DEBUGGING COMPLETED SUCCESSFULLY ===");
        
    } catch (error) {
        console.error("❌ Debug failed:", error);
        throw error;
    }
}

// Запуск, если файл вызван напрямую
if (require.main === module) {
    debugOwnTokens()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { debugOwnTokens }; 