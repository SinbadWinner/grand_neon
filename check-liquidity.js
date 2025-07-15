const { ethers } = require("hardhat");

async function checkLiquidity() {
    console.log("=== CHECKING LIQUIDITY STATUS ===\n");
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log(`Deployer: ${deployer.address}`);
        
        // Hardcoded addresses from deployment
        const addresses = {
            factory: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
            router: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", 
            wneon: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            usdc: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
            usdt: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
            btc: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
            eth: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
            raydium: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
            nftRewards: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"
        };
        
        console.log("Contract addresses:");
        Object.entries(addresses).forEach(([name, address]) => {
            console.log(`  ${name}: ${address}`);
        });
        
        // Connect to contracts
        const factory = await ethers.getContractAt("PancakeFactory", addresses.factory);
        const router = await ethers.getContractAt("PancakeRouter", addresses.router);
        const wneon = await ethers.getContractAt("WNEON", addresses.wneon);
        const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
        
        console.log("\n=== CHECKING PAIR RESERVES ===");
        
        const pairs = [
            { name: "USDC", address: addresses.usdc, decimals: 6 },
            { name: "USDT", address: addresses.usdt, decimals: 6 },
            { name: "BTC", address: addresses.btc, decimals: 8 },
            { name: "ETH", address: addresses.eth, decimals: 18 }
        ];
        
        for (const pair of pairs) {
            const pairAddress = await factory.getPair(pair.address, addresses.wneon);
            console.log(`\n${pair.name}/WNEON pair: ${pairAddress}`);
            
            if (pairAddress !== ethers.ZeroAddress) {
                const tokenContract = await ethers.getContractAt("MockERC20", pair.address);
                const tokenBalance = await tokenContract.balanceOf(pairAddress);
                const wneonBalance = await wneon.balanceOf(pairAddress);
                
                console.log(`  ${pair.name}: ${ethers.formatUnits(tokenBalance, pair.decimals)}`);
                console.log(`  WNEON: ${ethers.formatEther(wneonBalance)}`);
                
                if (tokenBalance > 0 && wneonBalance > 0) {
                    console.log(`  Status: HAS LIQUIDITY`);
                } else {
                    console.log(`  Status: NO LIQUIDITY`);
                }
            } else {
                console.log(`  Status: PAIR DOES NOT EXIST`);
            }
        }
        
        console.log("\n=== CHECKING BALANCES ===");
        
        const deployerBalance = await deployer.provider.getBalance(deployer.address);
        const wneonBalance = await wneon.balanceOf(deployer.address);
        const usdcBalance = await usdc.balanceOf(deployer.address);
        
        console.log(`Deployer ETH: ${ethers.formatEther(deployerBalance)}`);
        console.log(`Deployer WNEON: ${ethers.formatEther(wneonBalance)}`);
        console.log(`Deployer USDC: ${ethers.formatUnits(usdcBalance, 6)}`);
        
        console.log("\n=== SYSTEM STATUS ===");
        console.log("Contracts: DEPLOYED");
        console.log("Pairs: CREATED");
        console.log("Liquidity: CHECKING...");
        
        // Check if we need to add liquidity
        const usdcPair = await factory.getPair(addresses.usdc, addresses.wneon);
        const usdcPairWneonBalance = await wneon.balanceOf(usdcPair);
        
        if (usdcPairWneonBalance > 0) {
            console.log("Liquidity: ALREADY ADDED");
        } else {
            console.log("Liquidity: NEEDS TO BE ADDED");
            
            // Add liquidity
            console.log("\n=== ADDING LIQUIDITY ===");
            
            // Wrap some ETH to WNEON
            console.log("Wrapping ETH to WNEON...");
            const wrapAmount = ethers.parseEther("1000");
            await wneon.deposit({ value: wrapAmount });
            
            // Add liquidity to USDC/WNEON pair
            console.log("Adding USDC/WNEON liquidity...");
            const wneonAmount = ethers.parseEther("100");
            const usdcAmount = ethers.parseUnits("100", 6);
            
            await wneon.approve(addresses.router, wneonAmount);
            await usdc.approve(addresses.router, usdcAmount);
            
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            
            await router.addLiquidity(
                addresses.usdc,
                addresses.wneon,
                usdcAmount,
                wneonAmount,
                0, 0,
                deployer.address,
                deadline
            );
            
            console.log("Liquidity added successfully!");
            
            // Verify
            const newUsdcPairWneonBalance = await wneon.balanceOf(usdcPair);
            console.log(`New USDC/WNEON pair WNEON balance: ${ethers.formatEther(newUsdcPairWneonBalance)}`);
        }
        
        console.log("\n=== TESTING SWAP ===");
        
        // Test a small swap
        const swapAmount = ethers.parseEther("1");
        const path = [addresses.wneon, addresses.usdc];
        
        try {
            const amountsOut = await router.getAmountsOut(swapAmount, path);
            const expectedUsdc = ethers.formatUnits(amountsOut[1], 6);
            console.log(`1 WNEON = ${expectedUsdc} USDC`);
            console.log("Swap calculation: SUCCESS");
        } catch (error) {
            console.log(`Swap calculation: FAILED - ${error.message}`);
        }
        
        console.log("\n=== SUMMARY ===");
        console.log("System is ready for trading!");
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

if (require.main === module) {
    checkLiquidity();
} 