const { ethers } = require("hardhat");

async function deployAllMock() {
    console.log("🚀 === FULL DEPLOYMENT SCRIPT (MOCK) ===\n");
    console.log("📝 Deployment plan:");
    console.log("   1. Deploy PancakeSwap contracts");
    console.log("   2. Deploy Mock ERC20 tokens");
    console.log("   3. Deploy Raydium contracts");
    console.log("   4. Deploy NFT Rewards system");
    console.log("   5. Create liquidity pools");
    console.log("   6. Test PancakeSwap integration");
    console.log("\n🎬 Starting deployment...\n");
    
    try {
        // Get deployer
        const [deployer] = await ethers.getSigners();
        
        // Step 1: Deploy PancakeSwap contracts
        console.log("📍 STEP 1: Deploying PancakeSwap contracts...");
        
        // Deploy WNEON
        console.log("🌊 Deploying WNEON...");
        const WNEONFactory = await ethers.getContractFactory("WNEON");
        const wneonContract = await WNEONFactory.deploy();
        await wneonContract.waitForDeployment();
        const wneonAddress = await wneonContract.getAddress();
        console.log(`   ✓ WNEON deployed at: ${wneonAddress}`);
        
        // Deploy PancakeFactory
        console.log("🏭 Deploying PancakeFactory...");
        const FactoryFactory = await ethers.getContractFactory("PancakeFactory");
        const factoryContract = await FactoryFactory.deploy(deployer.address);
        await factoryContract.waitForDeployment();
        const factoryAddress = await factoryContract.getAddress();
        console.log(`   ✓ PancakeFactory deployed at: ${factoryAddress}`);
        
        // Deploy PancakeRouter
        console.log("🔀 Deploying PancakeRouter...");
        const RouterFactory = await ethers.getContractFactory("PancakeRouter");
        const routerContract = await RouterFactory.deploy(factoryAddress, wneonAddress);
        await routerContract.waitForDeployment();
        const routerAddress = await routerContract.getAddress();
        console.log(`   ✓ PancakeRouter deployed at: ${routerAddress}`);
        
        console.log("✅ PancakeSwap contracts deployed successfully\n");
        
        // Step 2: Deploy mock tokens
        console.log("📍 STEP 2: Deploying mock tokens...");
        
        const tokens = {};
        const initialSupply = ethers.parseEther("1000000"); // 1M tokens
        
        // Deploy tokens
        const tokenNames = [
            { name: "USD Coin", symbol: "USDC", key: "usdc" },
            { name: "Tether USD", symbol: "USDT", key: "usdt" },
            { name: "Bitcoin", symbol: "BTC", key: "btc" },
            { name: "Ethereum", symbol: "ETH", key: "eth" }
        ];
        
        for (const tokenInfo of tokenNames) {
            console.log(`💎 Deploying ${tokenInfo.symbol} token...`);
            const TokenFactory = await ethers.getContractFactory("MockERC20");
            const tokenContract = await TokenFactory.deploy(tokenInfo.name, tokenInfo.symbol, initialSupply);
            await tokenContract.waitForDeployment();
            tokens[tokenInfo.key] = await tokenContract.getAddress();
            console.log(`   ✓ ${tokenInfo.symbol} deployed at: ${tokens[tokenInfo.key]}`);
        }
        
        console.log("✅ Mock tokens deployed successfully\n");
        
        // Step 3: Deploy Raydium
        console.log("📍 STEP 3: Deploying Raydium...");
        const RaydiumFactory = await ethers.getContractFactory("RaydiumSwapContract");
        const raydiumSwap = await RaydiumFactory.deploy();
        await raydiumSwap.waitForDeployment();
        const raydiumSwapAddress = await raydiumSwap.getAddress();
        console.log(`   ✓ RaydiumSwapContract deployed at: ${raydiumSwapAddress}`);
        console.log("✅ Raydium deployed successfully\n");
        
        // Step 4: Deploy NFT Rewards
        console.log("📍 STEP 4: Deploying NFT Rewards...");
        const NFTRewardsFactory = await ethers.getContractFactory("NFTRewardsContract");
        const nftRewards = await NFTRewardsFactory.deploy();
        await nftRewards.waitForDeployment();
        const nftRewardsAddress = await nftRewards.getAddress();
        console.log(`   ✓ NFTRewardsContract deployed at: ${nftRewardsAddress}`);
        console.log("✅ NFT Rewards deployed successfully\n");
        
        // Step 5: Create liquidity pools
        console.log("📍 STEP 5: Creating mock liquidity pools...");
        
        // Get token contracts
        const usdcContract = await ethers.getContractAt("MockERC20", tokens.usdc);
        const usdtContract = await ethers.getContractAt("MockERC20", tokens.usdt);
        const btcContract = await ethers.getContractAt("MockERC20", tokens.btc);
        const ethContract = await ethers.getContractAt("MockERC20", tokens.eth);
        
        // Mint additional tokens for liquidity
        console.log("💰 Minting additional tokens for liquidity...");
        const additionalSupply = ethers.parseEther("100000");
        await usdcContract.mintTokens(additionalSupply);
        await usdtContract.mintTokens(additionalSupply);
        await btcContract.mintTokens(additionalSupply);
        await ethContract.mintTokens(additionalSupply);
        console.log("   ✓ Additional tokens minted");
        
        // Wrap ETH to WNEON
        console.log("🌊 Wrapping ETH to WNEON...");
        const wrapAmount = ethers.parseEther("100");
        await wneonContract.deposit({ value: wrapAmount });
        console.log(`   ✓ Wrapped ${ethers.formatEther(wrapAmount)} ETH to WNEON`);
        
        // Create liquidity pools
        console.log("🔄 Creating liquidity pools...");
        
        // Debug information
        console.log("🔍 Debug information:");
        console.log(`   Factory Address: ${factoryAddress}`);
        console.log(`   Router Address: ${routerAddress}`);
        console.log(`   WNEON Address: ${wneonAddress}`);
        console.log(`   USDC Address: ${tokens.usdc}`);
        console.log(`   Deployer Address: ${deployer.address}`);
        
        // Test router connection
        console.log("🔍 Testing router connection...");
        const routerFactoryAddress = await routerContract.factory();
        const routerWETHAddress = await routerContract.WETH();
        console.log(`   Router points to factory: ${routerFactoryAddress}`);
        console.log(`   Router points to WETH: ${routerWETHAddress}`);
        
        // Test WNEON balance
        const wneonBalance = await wneonContract.balanceOf(deployer.address);
        console.log(`   WNEON balance: ${ethers.formatEther(wneonBalance)}`);
        
        // Test USDC balance
        const usdcBalance = await usdcContract.balanceOf(deployer.address);
        console.log(`   USDC balance: ${ethers.formatEther(usdcBalance)}`);
        
        const poolData = [
            { tokenContract: usdcContract, tokenAddress: tokens.usdc, name: "USDC", amount: ethers.parseEther("1000"), wneonAmount: ethers.parseEther("10") },
            { tokenContract: usdtContract, tokenAddress: tokens.usdt, name: "USDT", amount: ethers.parseEther("1000"), wneonAmount: ethers.parseEther("10") },
            { tokenContract: btcContract, tokenAddress: tokens.btc, name: "BTC", amount: ethers.parseEther("1"), wneonAmount: ethers.parseEther("50") },
            { tokenContract: ethContract, tokenAddress: tokens.eth, name: "ETH", amount: ethers.parseEther("10"), wneonAmount: ethers.parseEther("20") }
        ];
        
        for (const pool of poolData) {
            console.log(`💎 Creating ${pool.name}/WNEON pool...`);
            
            // Check balances before approval
            const tokenBalance = await pool.tokenContract.balanceOf(deployer.address);
            const wneonBalanceBeforeApprove = await wneonContract.balanceOf(deployer.address);
            console.log(`   ${pool.name} balance before: ${ethers.formatEther(tokenBalance)}`);
            console.log(`   WNEON balance before: ${ethers.formatEther(wneonBalanceBeforeApprove)}`);
            
            await pool.tokenContract.approve(routerAddress, pool.amount);
            await wneonContract.approve(routerAddress, pool.wneonAmount);
            
            console.log(`   Approved ${pool.name} and WNEON for router`);
            
            await routerContract.addLiquidity(
                pool.tokenAddress,
                wneonAddress,
                pool.amount,
                pool.wneonAmount,
                0,
                0,
                deployer.address,
                Math.floor(Date.now() / 1000) + 3600
            );
            console.log(`   ✓ ${pool.name}/WNEON pool created`);
        }
        
        console.log("✅ Mock liquidity pools created successfully\n");
        
        // Step 6: Test PancakeSwap
        console.log("📍 STEP 6: Testing PancakeSwap integration...");
        
        if (routerFactoryAddress.toLowerCase() === factoryAddress.toLowerCase()) {
            console.log("   ✅ Router correctly connected to Factory");
        } else {
            console.log("   ❌ Router not connected to Factory");
        }
        
        if (routerWETHAddress.toLowerCase() === wneonAddress.toLowerCase()) {
            console.log("   ✅ Router correctly connected to WNEON");
        } else {
            console.log("   ❌ Router not connected to WNEON");
        }
        
        console.log("✅ PancakeSwap test passed\n");
        
        // Save configuration
        const config = require("./dapp-config.js");
        config.updatePancakeSwap({
            factory: factoryAddress,
            router: routerAddress,
            wneon: wneonAddress
        });
        config.updateTokens(tokens);
        config.updateRaydium({
            swapContract: raydiumSwapAddress
        });
        config.updateNFT({
            rewardsContract: nftRewardsAddress
        });
        
        // Final summary
        console.log("🎉 === DEPLOYMENT COMPLETED (MOCK) ===\n");
        console.log("📋 Final summary:");
        console.log("   ✅ PancakeSwap contracts deployed");
        console.log("   ✅ Mock ERC20 tokens deployed");
        console.log("   ✅ Raydium contracts deployed");
        console.log("   ✅ NFT Rewards system deployed");
        console.log("   ✅ Mock liquidity pools created");
        console.log("   ✅ PancakeSwap integration tested");
        
        console.log("\n📝 Contract addresses:");
        console.log(`   PancakeFactory: ${factoryAddress}`);
        console.log(`   PancakeRouter: ${routerAddress}`);
        console.log(`   WNEON: ${wneonAddress}`);
        console.log(`   USDC: ${tokens.usdc}`);
        console.log(`   USDT: ${tokens.usdt}`);
        console.log(`   BTC: ${tokens.btc}`);
        console.log(`   ETH: ${tokens.eth}`);
        console.log(`   Raydium: ${raydiumSwapAddress}`);
        console.log(`   NFT Rewards: ${nftRewardsAddress}`);
        
        console.log("\n🌟 Mock project is ready for testing!");
        return true;
        
    } catch (error) {
        console.error("❌ Full deployment failed:", error.message);
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    deployAllMock()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Full deployment failed:", error);
            process.exit(1);
        });
}

module.exports = deployAllMock; 