const { ethers } = require("hardhat");

async function testNetwork() {
    console.log("🌐 Testing network connection...");
    
    try {
        // Get provider
        const provider = ethers.provider;
        
        // Check network
        const network = await provider.getNetwork();
        console.log(`Network: ${network.name} (${network.chainId})`);
        
        // Get block number
        const blockNumber = await provider.getBlockNumber();
        console.log(`Block number: ${blockNumber}`);
        
        // Get accounts
        const accounts = await ethers.getSigners();
        console.log(`Accounts: ${accounts.length}`);
        console.log(`First account: ${accounts[0].address}`);
        
        // Get balance
        const balance = await provider.getBalance(accounts[0].address);
        console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
        
        console.log("✅ Network connection successful!");
        return true;
        
    } catch (error) {
        console.error("❌ Network test failed:", error.message);
        return false;
    }
}

testNetwork(); 