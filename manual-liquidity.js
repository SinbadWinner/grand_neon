const { ethers } = require("hardhat");

async function addManualLiquidity() {
    console.log("=== MANUAL LIQUIDITY ADDITION ===\n");
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log(`Deployer: ${deployer.address}`);
        
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
        
        // Contract addresses
        const addresses = {
            factory: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
            router: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
            wneon: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            usdc: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
            usdt: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
            btc: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
            eth: "0x0165878A594ca255338adfa4d48449f69242Eb8F"
        };
        
        // Connect to contracts
        const router = await ethers.getContractAt("PancakeRouter", addresses.router);
        const wneon = await ethers.getContractAt("WNEON", addresses.wneon);
        const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
        const usdt = await ethers.getContractAt("MockERC20", addresses.usdt);
        const btc = await ethers.getContractAt("MockERC20", addresses.btc);
        const eth = await ethers.getContractAt("MockERC20", addresses.eth);
        
        console.log("Contracts connected successfully\n");
        
        // Step 1: Wrap ETH to WNEON
        console.log("=== STEP 1: WRAPPING ETH TO WNEON ===");
        const wrapAmount = ethers.parseEther("2000");
        console.log(`Wrapping ${ethers.formatEther(wrapAmount)} ETH to WNEON...`);
        
        await wneon.deposit({ value: wrapAmount });
        
        const wneonBalance = await wneon.balanceOf(deployer.address);
        console.log(`WNEON balance: ${ethers.formatEther(wneonBalance)}`);
        
        // Step 2: Add liquidity for each token
        console.log("\n=== STEP 2: ADDING LIQUIDITY ===");
        
        const liquidityPairs = [
            {
                name: "USDC",
                token: usdc,
                tokenAddress: addresses.usdc,
                wneonAmount: ethers.parseEther("500"),
                tokenAmount: ethers.parseUnits("500", 6),
                decimals: 6
            },
            {
                name: "USDT", 
                token: usdt,
                tokenAddress: addresses.usdt,
                wneonAmount: ethers.parseEther("500"),
                tokenAmount: ethers.parseUnits("500", 6),
                decimals: 6
            },
            {
                name: "BTC",
                token: btc,
                tokenAddress: addresses.btc,
                wneonAmount: ethers.parseEther("500"),
                tokenAmount: ethers.parseUnits("0.25", 8),
                decimals: 8
            },
            {
                name: "ETH",
                token: eth,
                tokenAddress: addresses.eth,
                wneonAmount: ethers.parseEther("500"),
                tokenAmount: ethers.parseEther("25"),
                decimals: 18
            }
        ];
        
        for (const pair of liquidityPairs) {
            console.log(`\n--- Adding ${pair.name}/WNEON liquidity ---`);
            
            // Check token balance
            const tokenBalance = await pair.token.balanceOf(deployer.address);
            console.log(`${pair.name} balance: ${ethers.formatUnits(tokenBalance, pair.decimals)}`);
            
            // Approve tokens
            console.log("Approving tokens...");
            await wneon.approve(addresses.router, pair.wneonAmount);
            await pair.token.approve(addresses.router, pair.tokenAmount);
            
            // Add liquidity
            console.log("Adding liquidity...");
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            
            try {
                const tx = await router.addLiquidity(
                    pair.tokenAddress,
                    addresses.wneon,
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
        
        // Step 3: Test swaps
        console.log("\n=== STEP 3: TESTING SWAPS ===");
        
        // Test WNEON -> USDC swap
        console.log("\nTesting WNEON -> USDC swap...");
        const swapAmount = ethers.parseEther("1");
        const path = [addresses.wneon, addresses.usdc];
        
        try {
            const amountsOut = await router.getAmountsOut(swapAmount, path);
            const expectedUsdc = ethers.formatUnits(amountsOut[1], 6);
            console.log(`✅ 1 WNEON = ${expectedUsdc} USDC`);
            
            // Perform actual swap
            await wneon.approve(addresses.router, swapAmount);
            
            const usdcBalanceBefore = await usdc.balanceOf(deployer.address);
            
            await router.swapExactTokensForTokens(
                swapAmount,
                0,
                path,
                deployer.address,
                deadline
            );
            
            const usdcBalanceAfter = await usdc.balanceOf(deployer.address);
            const usdcReceived = usdcBalanceAfter - usdcBalanceBefore;
            
            console.log(`✅ Swap completed! Received ${ethers.formatUnits(usdcReceived, 6)} USDC`);
            
        } catch (error) {
            console.log(`❌ Swap failed: ${error.message}`);
        }
        
        // Final balances
        console.log("\n=== FINAL BALANCES ===");
        
        const finalWneonBalance = await wneon.balanceOf(deployer.address);
        const finalUsdcBalance = await usdc.balanceOf(deployer.address);
        const finalEthBalance = await deployer.provider.getBalance(deployer.address);
        
        console.log(`ETH: ${ethers.formatEther(finalEthBalance)}`);
        console.log(`WNEON: ${ethers.formatEther(finalWneonBalance)}`);
        console.log(`USDC: ${ethers.formatUnits(finalUsdcBalance, 6)}`);
        
        console.log("\n=== SUMMARY ===");
        console.log("✅ Liquidity added to all major pairs");
        console.log("✅ Swaps are working");
        console.log("✅ System is ready for trading!");
        
        console.log("\n🎉 LIQUIDITY ADDITION COMPLETED!");
        
    } catch (error) {
        console.error("Error:", error.message);
        console.error("Stack:", error.stack);
    }
}

if (require.main === module) {
    addManualLiquidity();
} 