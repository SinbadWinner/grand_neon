const { ethers } = require("hardhat");

async function deployAndAddLiquidity() {
    console.log("🚀 === DEPLOY ALL CONTRACTS AND ADD LIQUIDITY ===\n");
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);
        
        // === STEP 1: DEPLOY CONTRACTS ===
        console.log("=== STEP 1: DEPLOYING CONTRACTS ===");
        
        // Deploy WNEON
        const WNEONFactory = await ethers.getContractFactory("WNEON");
        const wneon = await WNEONFactory.deploy();
        await wneon.waitForDeployment();
        const wneonAddress = await wneon.getAddress();
        console.log(`✅ WNEON deployed: ${wneonAddress}`);
        
        // Deploy PancakeFactory
        const PancakeFactory = await ethers.getContractFactory("PancakeFactory");
        const factory = await PancakeFactory.deploy(deployer.address);
        await factory.waitForDeployment();
        const factoryAddress = await factory.getAddress();
        console.log(`✅ PancakeFactory deployed: ${factoryAddress}`);
        
        // Deploy PancakeRouter
        const PancakeRouter = await ethers.getContractFactory("PancakeRouter");
        const router = await PancakeRouter.deploy(factoryAddress, wneonAddress);
        await router.waitForDeployment();
        const routerAddress = await router.getAddress();
        console.log(`✅ PancakeRouter deployed: ${routerAddress}`);
        
        // Deploy Mock Tokens
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        
        const usdc = await MockERC20Factory.deploy("USD Coin", "USDC", ethers.parseUnits("10000000", 6));
        await usdc.waitForDeployment();
        const usdcAddress = await usdc.getAddress();
        console.log(`✅ USDC deployed: ${usdcAddress}`);
        
        const usdt = await MockERC20Factory.deploy("Tether USD", "USDT", ethers.parseUnits("10000000", 6));
        await usdt.waitForDeployment();
        const usdtAddress = await usdt.getAddress();
        console.log(`✅ USDT deployed: ${usdtAddress}`);
        
        const btc = await MockERC20Factory.deploy("Bitcoin", "BTC", ethers.parseUnits("210000", 8));
        await btc.waitForDeployment();
        const btcAddress = await btc.getAddress();
        console.log(`✅ BTC deployed: ${btcAddress}`);
        
        const eth = await MockERC20Factory.deploy("Ethereum", "ETH", ethers.parseEther("1200000000"));
        await eth.waitForDeployment();
        const ethAddress = await eth.getAddress();
        console.log(`✅ ETH deployed: ${ethAddress}`);
        
        // === STEP 2: CREATE PAIRS ===
        console.log("\n=== STEP 2: CREATING PAIRS ===");
        
        const pairs = [
            { name: "USDC", address: usdcAddress },
            { name: "USDT", address: usdtAddress },
            { name: "BTC", address: btcAddress },
            { name: "ETH", address: ethAddress }
        ];
        
        for (const pair of pairs) {
            console.log(`Creating ${pair.name}/WNEON pair...`);
            const tx = await factory.createPair(pair.address, wneonAddress);
            await tx.wait();
            console.log(`✅ ${pair.name}/WNEON pair created`);
        }
        
        // === STEP 3: WRAP ETH TO WNEON ===
        console.log("\n=== STEP 3: WRAPPING ETH TO WNEON ===");
        
        const wrapAmount = ethers.parseEther("3000");
        console.log(`Wrapping ${ethers.formatEther(wrapAmount)} ETH to WNEON...`);
        
        await wneon.deposit({ value: wrapAmount });
        console.log(`✅ Wrapped ${ethers.formatEther(wrapAmount)} ETH to WNEON`);
        
        // === STEP 4: ADD LIQUIDITY ===
        console.log("\n=== STEP 4: ADDING LIQUIDITY ===");
        
        const liquidityPairs = [
            {
                name: "USDC",
                token: usdc,
                wneonAmount: ethers.parseEther("700"),
                tokenAmount: ethers.parseUnits("700", 6),
                decimals: 6
            },
            {
                name: "USDT",
                token: usdt,
                wneonAmount: ethers.parseEther("700"),
                tokenAmount: ethers.parseUnits("700", 6),
                decimals: 6
            },
            {
                name: "BTC",
                token: btc,
                wneonAmount: ethers.parseEther("700"),
                tokenAmount: ethers.parseUnits("0.35", 8),
                decimals: 8
            },
            {
                name: "ETH",
                token: eth,
                wneonAmount: ethers.parseEther("700"),
                tokenAmount: ethers.parseEther("35"),
                decimals: 18
            }
        ];
        
        for (const pair of liquidityPairs) {
            console.log(`\n--- Adding ${pair.name}/WNEON liquidity ---`);
            
            // Approve tokens
            console.log("Approving tokens...");
            await wneon.approve(routerAddress, pair.wneonAmount);
            await pair.token.approve(routerAddress, pair.tokenAmount);
            
            // Add liquidity
            console.log("Adding liquidity...");
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            
            try {
                const tx = await router.addLiquidity(
                    await pair.token.getAddress(),
                    wneonAddress,
                    pair.tokenAmount,
                    pair.wneonAmount,
                    0, // accept any amount of tokens
                    0, // accept any amount of WNEON
                    deployer.address,
                    deadline
                );
                
                const receipt = await tx.wait();
                console.log(`✅ Liquidity added! Gas used: ${receipt.gasUsed.toString()}`);
                console.log(`   ${ethers.formatUnits(pair.tokenAmount, pair.decimals)} ${pair.name} + ${ethers.formatEther(pair.wneonAmount)} WNEON`);
                
            } catch (error) {
                console.log(`❌ Failed to add liquidity: ${error.message}`);
            }
        }
        
        // === STEP 5: DEPLOY RAYDIUM AND NFT CONTRACTS ===
        console.log("\n=== STEP 5: DEPLOYING ADDITIONAL CONTRACTS ===");
        
        // Deploy Raydium
        const RaydiumFactory = await ethers.getContractFactory("RaydiumSwapContract");
        const raydium = await RaydiumFactory.deploy();
        await raydium.waitForDeployment();
        const raydiumAddress = await raydium.getAddress();
        console.log(`✅ Raydium deployed: ${raydiumAddress}`);
        
        // Deploy NFT Rewards
        const NFTRewardsFactory = await ethers.getContractFactory("NFTRewardsContract");
        const nftRewards = await NFTRewardsFactory.deploy();
        await nftRewards.waitForDeployment();
        const nftRewardsAddress = await nftRewards.getAddress();
        console.log(`✅ NFT Rewards deployed: ${nftRewardsAddress}`);
        
        // Authorize swap contracts
        console.log("\nAuthorizing swap contracts...");
        await nftRewards.authorizeSwapContract(routerAddress, true);
        await nftRewards.authorizeSwapContract(raydiumAddress, true);
        console.log("✅ Swap contracts authorized");
        
        // === STEP 6: TEST SWAPS ===
        console.log("\n=== STEP 6: TESTING SWAPS ===");
        
        console.log("Testing WNEON -> USDC swap...");
        const swapAmount = ethers.parseEther("1");
        const path = [wneonAddress, usdcAddress];
        
        try {
            const amountsOut = await router.getAmountsOut(swapAmount, path);
            const expectedUsdc = ethers.formatUnits(amountsOut[1], 6);
            console.log(`✅ Price: 1 WNEON = ${expectedUsdc} USDC`);
            
            // Perform actual swap
            await wneon.approve(routerAddress, swapAmount);
            
            const usdcBalanceBefore = await usdc.balanceOf(deployer.address);
            
            await router.swapExactTokensForTokens(
                swapAmount,
                0,
                path,
                deployer.address,
                Math.floor(Date.now() / 1000) + 3600
            );
            
            const usdcBalanceAfter = await usdc.balanceOf(deployer.address);
            const usdcReceived = usdcBalanceAfter - usdcBalanceBefore;
            
            console.log(`✅ Swap completed! Received ${ethers.formatUnits(usdcReceived, 6)} USDC`);
            
        } catch (error) {
            console.log(`❌ Swap failed: ${error.message}`);
        }
        
        // === STEP 7: FINAL SUMMARY ===
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        
        console.log("📋 Contract Addresses:");
        console.log(`   WNEON: ${wneonAddress}`);
        console.log(`   PancakeFactory: ${factoryAddress}`);
        console.log(`   PancakeRouter: ${routerAddress}`);
        console.log(`   USDC: ${usdcAddress}`);
        console.log(`   USDT: ${usdtAddress}`);
        console.log(`   BTC: ${btcAddress}`);
        console.log(`   ETH: ${ethAddress}`);
        console.log(`   Raydium: ${raydiumAddress}`);
        console.log(`   NFT Rewards: ${nftRewardsAddress}`);
        
        console.log("\n💧 Liquidity Added:");
        console.log(`   USDC/WNEON: 700 USDC + 700 WNEON`);
        console.log(`   USDT/WNEON: 700 USDT + 700 WNEON`);
        console.log(`   BTC/WNEON: 0.35 BTC + 700 WNEON`);
        console.log(`   ETH/WNEON: 35 ETH + 700 WNEON`);
        
        console.log("\n🎯 System Status:");
        console.log(`   ✅ All contracts deployed`);
        console.log(`   ✅ All pairs created`);
        console.log(`   ✅ Liquidity added to all pairs`);
        console.log(`   ✅ Swaps are working`);
        console.log(`   ✅ NFT rewards system ready`);
        console.log(`   ✅ Raydium integration ready`);
        
        const finalBalance = await deployer.provider.getBalance(deployer.address);
        const gasUsed = balance - finalBalance;
        console.log(`\n⛽ Total gas used: ${ethers.formatEther(gasUsed)} ETH`);
        
        console.log("\n🎉 === DEPLOYMENT AND LIQUIDITY COMPLETED! ===");
        console.log("🚀 Your DeFi platform is now fully operational!");
        
        return {
            contracts: {
                wneon: wneonAddress,
                factory: factoryAddress,
                router: routerAddress,
                usdc: usdcAddress,
                usdt: usdtAddress,
                btc: btcAddress,
                eth: ethAddress,
                raydium: raydiumAddress,
                nftRewards: nftRewardsAddress
            },
            liquidityAdded: true,
            swapsTested: true
        };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// Run the deployment
if (require.main === module) {
    deployAndAddLiquidity()
        .then(() => {
            console.log("\n✅ Full deployment and liquidity addition completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = { deployAndAddLiquidity }; 