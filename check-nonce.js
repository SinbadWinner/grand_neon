const { ethers } = require("hardhat");
require('dotenv').config();

async function checkNonce() {
    console.log("🔍 Checking nonce information...");
    
    try {
        const [deployer] = await ethers.getSigners();
        console.log(`👤 Deployer: ${deployer.address}`);
        
        // Получаем nonce для подтвержденных транзакций
        const confirmedNonce = await ethers.provider.getTransactionCount(deployer.address, 'latest');
        console.log(`✅ Confirmed nonce (latest): ${confirmedNonce}`);
        
        // Получаем nonce включая pending транзакции
        const pendingNonce = await ethers.provider.getTransactionCount(deployer.address, 'pending');
        console.log(`⏳ Pending nonce (pending): ${pendingNonce}`);
        
        const pendingCount = pendingNonce - confirmedNonce;
        console.log(`🔄 Pending transactions: ${pendingCount}`);
        
        if (pendingCount > 0) {
            console.log("⚠️  You have pending transactions that may be stuck!");
            console.log("💡 Options:");
            console.log("   1. Wait for them to confirm");
            console.log("   2. Cancel them by sending 0 ETH to yourself with higher gas");
            console.log("   3. Use confirmed nonce instead of pending");
        } else {
            console.log("✅ No pending transactions");
        }
        
        // Проверяем баланс
        const balance = await ethers.provider.getBalance(deployer.address);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} NEON`);
        
    } catch (error) {
        console.error("❌ Error checking nonce:", error.message);
    }
}

checkNonce(); 