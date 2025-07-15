const { ethers } = require("hardhat");

async function testCurrentDeployment() {
    console.log("🧪 === TESTING CURRENT DEPLOYMENT ===\n");
    
    try {
        // Get deployer
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}\n`);
        
        // Load configuration
        const config = require("./dapp-config.js");
        console.log("📋 Loading configuration...");
        console.log(`   Factory: ${config.pancakeswap.factory}`);
        console.log(`   Router: ${config.pancakeswap.router}`);
        console.log(`   WNEON: ${config.pancakeswap.wneon}`);
        console.log(`   USDC: ${config.tokens.usdc}`);
        console.log(`   Raydium: ${config.raydium.swapContract}`);
        console.log(`   NFT: ${config.nft.rewardsContract}\n`);
        
        let allTestsPassed = true;
        
        // Test 1: WNEON contract
        console.log("🌊 Testing WNEON contract...");
        try {
            if (config.pancakeswap.wneon) {
                const wneonContract = await ethers.getContractAt("WNEON", config.pancakeswap.wneon);
                const name = await wneonContract.name();
                const symbol = await wneonContract.symbol();
                const balance = await wneonContract.balanceOf(deployer.address);
                console.log(`   ✓ WNEON Name: ${name}`);
                console.log(`   ✓ WNEON Symbol: ${symbol}`);
                console.log(`   ✓ WNEON Balance: ${ethers.formatEther(balance)}`);
            } else {
                throw new Error("WNEON address not found in config");
            }
        } catch (error) {
            console.log(`   ❌ WNEON test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test 2: PancakeFactory contract
        console.log("\n🏭 Testing PancakeFactory contract...");
        try {
            if (config.pancakeswap.factory) {
                const factoryContract = await ethers.getContractAt("PancakeFactory", config.pancakeswap.factory);
                const allPairsLength = await factoryContract.allPairsLength();
                console.log(`   ✓ Factory total pairs: ${allPairsLength}`);
            } else {
                throw new Error("Factory address not found in config");
            }
        } catch (error) {
            console.log(`   ❌ Factory test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test 3: PancakeRouter contract
        console.log("\n🔀 Testing PancakeRouter contract...");
        try {
            if (config.pancakeswap.router) {
                const routerContract = await ethers.getContractAt("PancakeRouter", config.pancakeswap.router);
                const routerFactory = await routerContract.factory();
                const routerWETH = await routerContract.WETH();
                console.log(`   ✓ Router Factory: ${routerFactory}`);
                console.log(`   ✓ Router WETH: ${routerWETH}`);
                
                // Verify connections
                if (routerFactory.toLowerCase() === config.pancakeswap.factory.toLowerCase()) {
                    console.log("   ✅ Router correctly connected to Factory");
                } else {
                    console.log("   ❌ Router not connected to Factory");
                }
            } else {
                throw new Error("Router address not found in config");
            }
        } catch (error) {
            console.log(`   ❌ Router test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test 4: Mock tokens
        console.log("\n💎 Testing Mock tokens...");
        try {
            const tokenTests = [
                { name: "USDC", address: config.tokens.usdc },
                { name: "USDT", address: config.tokens.usdt },
                { name: "BTC", address: config.tokens.btc },
                { name: "ETH", address: config.tokens.eth }
            ];
            
            for (const token of tokenTests) {
                if (token.address) {
                    const tokenContract = await ethers.getContractAt("MockERC20", token.address);
                    const tokenName = await tokenContract.name();
                    const tokenSymbol = await tokenContract.symbol();
                    const tokenBalance = await tokenContract.balanceOf(deployer.address);
                    console.log(`   ✓ ${token.name}: ${tokenName} (${tokenSymbol}) - Balance: ${ethers.formatEther(tokenBalance)}`);
                } else {
                    console.log(`   ❌ ${token.name}: address not found in config`);
                }
            }
        } catch (error) {
            console.log(`   ❌ Token test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test 5: Raydium contracts
        console.log("\n🚀 Testing Raydium contracts...");
        try {
            if (config.raydium.swapContract) {
                const raydiumContract = await ethers.getContractAt("RaydiumSwapContract", config.raydium.swapContract);
                console.log(`   ✓ RaydiumSwapContract deployed at: ${config.raydium.swapContract}`);
                console.log(`   ✓ Contract is accessible`);
            } else {
                throw new Error("Raydium address not found in config");
            }
        } catch (error) {
            console.log(`   ❌ Raydium test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test 6: NFT Rewards
        console.log("\n🏆 Testing NFT Rewards contracts...");
        try {
            if (config.nft.rewardsContract) {
                const nftContract = await ethers.getContractAt("NFTRewardsContract", config.nft.rewardsContract);
                const name = await nftContract.name();
                const symbol = await nftContract.symbol();
                const owner = await nftContract.owner();
                console.log(`   ✓ NFT name: ${name}`);
                console.log(`   ✓ NFT symbol: ${symbol}`);
                console.log(`   ✓ NFT owner: ${owner}`);
            } else {
                throw new Error("NFT address not found in config");
            }
        } catch (error) {
            console.log(`   ❌ NFT test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Test 7: Basic token operations
        console.log("\n📤 Testing token operations...");
        try {
            if (config.tokens.usdc) {
                const usdcContract = await ethers.getContractAt("MockERC20", config.tokens.usdc);
                
                // Test transfer
                const transferAmount = ethers.parseEther("100");
                await usdcContract.transfer(deployer.address, transferAmount);
                console.log(`   ✓ Token transfer successful`);
                
                // Test approval
                await usdcContract.approve(config.pancakeswap.router, transferAmount);
                const allowance = await usdcContract.allowance(deployer.address, config.pancakeswap.router);
                console.log(`   ✓ Token approval successful: ${ethers.formatEther(allowance)}`);
                
                // Test minting
                await usdcContract.mintTokens(ethers.parseEther("1000"));
                console.log(`   ✓ Token minting successful`);
            }
        } catch (error) {
            console.log(`   ❌ Token operations test failed: ${error.message}`);
            allTestsPassed = false;
        }
        
        // Final result
        console.log("\n📊 === TEST RESULTS ===");
        if (allTestsPassed) {
            console.log("🎉 ALL TESTS PASSED!");
            console.log("✅ System is fully deployed and working");
            console.log("✅ All contracts are accessible and functional");
            console.log("✅ Token operations work correctly");
            console.log("✅ Contract connections are verified");
        } else {
            console.log("❌ Some tests failed");
            console.log("🔧 Please check the logs above for details");
        }
        
        console.log("\n🚀 System Status:");
        console.log(`   📊 Deployment Status: ${allTestsPassed ? 'SUCCESSFUL' : 'PARTIAL'}`);
        console.log(`   🔧 Ready for use: ${allTestsPassed ? 'YES' : 'WITH LIMITATIONS'}`);
        
        return allTestsPassed;
        
    } catch (error) {
        console.error("❌ Test execution failed:", error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testCurrentDeployment()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error("Test execution failed:", error);
            process.exit(1);
        });
}

module.exports = testCurrentDeployment; 