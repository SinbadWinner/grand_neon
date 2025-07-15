const { ethers } = require("hardhat");
require('dotenv').config();

async function testNeonConnection() {
    console.log("🔍 Testing Neon EVM connection...");
    
    try {
        // Check network connection
        const network = await ethers.provider.getNetwork();
        console.log(`🌐 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
        
        if (network.chainId !== 245022926n) {
            console.log("❌ ERROR: Not connected to Neon EVM devnet");
            console.log("   Expected Chain ID: 245022926");
            console.log("   Current Chain ID:", network.chainId.toString());
            return;
        }
        
        // Check deployer account
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Check balance
        const balance = await ethers.provider.getBalance(deployer.address);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} NEON`);
        
        if (balance < ethers.parseEther("0.1")) {
            console.log("⚠️  WARNING: Low balance for deployment!");
        }
        
        console.log("✅ Connection test successful!");
        
    } catch (error) {
        console.error("❌ Connection test failed:", error.message);
        console.error("Full error:", error);
    }
}

testNeonConnection(); 