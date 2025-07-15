const { spawn } = require('child_process');
const { execSync } = require('child_process');
const path = require('path');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startFullSystem() {
    console.log("🚀 === STARTING FULL DEFI SYSTEM ===\n");
    
    try {
        // 1. Start Hardhat node in background
        console.log("🌐 Starting Hardhat node...");
        
        const hardhatProcess = spawn('npx', ['hardhat', 'node'], {
            cwd: process.cwd(),
            detached: true,
            stdio: 'ignore' // Hide output
        });
        
        hardhatProcess.unref(); // Allow process to run independently
        
        console.log("✅ Hardhat node started in background");
        
        // 2. Wait for node to be ready
        console.log("⏳ Waiting for network to be ready...");
        await sleep(8000); // Wait 8 seconds for node to fully start
        
        // 3. Test network connection
        console.log("🔍 Testing network connection...");
        try {
            execSync('node test-network.js', { stdio: 'inherit' });
            console.log("✅ Network connection successful");
        } catch (error) {
            console.log("⚠️  Network test failed, but continuing...");
        }
        
        // 4. Deploy all contracts
        console.log("\n🔧 Deploying all contracts...");
        execSync('node deploy-all-simplified.js', { stdio: 'inherit' });
        console.log("✅ All contracts deployed successfully");
        
        // 5. Run final system test
        console.log("\n🧪 Running final system test...");
        execSync('node test-final-system.js', { stdio: 'inherit' });
        console.log("✅ Final system test completed");
        
        console.log("\n🎉 === FULL DEFI SYSTEM IS READY! ===");
        console.log("✅ Hardhat node: RUNNING");
        console.log("✅ All contracts: DEPLOYED");
        console.log("✅ System tests: PASSED");
        console.log("✅ Ready for frontend integration!");
        
        console.log("\n📋 === NEXT STEPS ===");
        console.log("1. Connect your frontend to http://127.0.0.1:8545");
        console.log("2. Use the contract addresses from the deployment");
        console.log("3. Users can connect wallets and start trading");
        console.log("4. NFT rewards will be automatically distributed");
        
    } catch (error) {
        console.error("❌ Error starting system:", error.message);
        process.exit(1);
    }
}

// Run the system startup
startFullSystem(); 