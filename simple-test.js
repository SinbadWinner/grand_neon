const { ethers } = require("hardhat");

async function simpleTest() {
    console.log("=== SIMPLE CONTRACT TEST ===\n");
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log(`Deployer: ${deployer.address}`);
        
        const balance = await deployer.provider.getBalance(deployer.address);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
        
        // Test WNEON contract
        const wneonAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        console.log(`\nTesting WNEON at: ${wneonAddress}`);
        
        const code = await ethers.provider.getCode(wneonAddress);
        console.log(`Code length: ${code.length}`);
        
        if (code !== "0x") {
            const wneon = await ethers.getContractAt("WNEON", wneonAddress);
            
            try {
                const name = await wneon.name();
                const symbol = await wneon.symbol();
                const deployerBalance = await wneon.balanceOf(deployer.address);
                
                console.log(`Name: ${name}`);
                console.log(`Symbol: ${symbol}`);
                console.log(`Balance: ${ethers.formatEther(deployerBalance)}`);
                
                // Test wrapping
                console.log("\nTesting wrap function...");
                const wrapAmount = ethers.parseEther("10");
                await wneon.deposit({ value: wrapAmount });
                
                const newBalance = await wneon.balanceOf(deployer.address);
                console.log(`New balance: ${ethers.formatEther(newBalance)}`);
                
                console.log("WNEON: SUCCESS");
                
            } catch (error) {
                console.log(`WNEON function call failed: ${error.message}`);
            }
        } else {
            console.log("WNEON: NOT DEPLOYED");
        }
        
        // Test USDC contract
        const usdcAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
        console.log(`\nTesting USDC at: ${usdcAddress}`);
        
        const usdcCode = await ethers.provider.getCode(usdcAddress);
        console.log(`Code length: ${usdcCode.length}`);
        
        if (usdcCode !== "0x") {
            const usdc = await ethers.getContractAt("MockERC20", usdcAddress);
            
            try {
                const name = await usdc.name();
                const symbol = await usdc.symbol();
                const deployerBalance = await usdc.balanceOf(deployer.address);
                
                console.log(`Name: ${name}`);
                console.log(`Symbol: ${symbol}`);
                console.log(`Balance: ${ethers.formatUnits(deployerBalance, 6)}`);
                
                console.log("USDC: SUCCESS");
                
            } catch (error) {
                console.log(`USDC function call failed: ${error.message}`);
            }
        } else {
            console.log("USDC: NOT DEPLOYED");
        }
        
        // Test Factory contract
        const factoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
        console.log(`\nTesting Factory at: ${factoryAddress}`);
        
        const factoryCode = await ethers.provider.getCode(factoryAddress);
        console.log(`Code length: ${factoryCode.length}`);
        
        if (factoryCode !== "0x") {
            const factory = await ethers.getContractAt("PancakeFactory", factoryAddress);
            
            try {
                const feeToSetter = await factory.feeToSetter();
                console.log(`FeeToSetter: ${feeToSetter}`);
                
                console.log("Factory: SUCCESS");
                
            } catch (error) {
                console.log(`Factory function call failed: ${error.message}`);
            }
        } else {
            console.log("Factory: NOT DEPLOYED");
        }
        
        console.log("\n=== SUMMARY ===");
        console.log("If all contracts show SUCCESS, the system is working");
        
    } catch (error) {
        console.error("Error:", error.message);
    }
}

if (require.main === module) {
    simpleTest();
} 