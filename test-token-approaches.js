const { ethers } = require("hardhat");

async function testTokenApproaches() {
    console.log("🧪 === TESTING DIFFERENT TOKEN APPROACHES ===\n");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    
    console.log(`👤 Deployer: ${deployer.address}`);
    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})\n`);
    
    // === TEST 1: CURRENT APPROACH (WNEON + MockERC20) ===
    console.log("📊 === TEST 1: CURRENT APPROACH (WNEON + MockERC20) ===");
    console.log("✅ Pros:");
    console.log("   - Uses real WNEON contract architecture");
    console.log("   - Familiar for Neon ecosystem users");
    console.log("   - Already implemented and tested");
    console.log("❌ Cons:");
    console.log("   - Mixed logic (real WNEON + mock tokens)");
    console.log("   - Potential confusion about which is real");
    console.log("   - WNEON requires ETH for wrapping");
    
    // Test WNEON contract deployment
    console.log("\n🔄 Testing WNEON deployment...");
    try {
        const WNEONFactory = await ethers.getContractFactory("WNEON");
        const wneon = await WNEONFactory.deploy();
        await wneon.waitForDeployment();
        
        const name = await wneon.name();
        const symbol = await wneon.symbol();
        console.log(`   ✅ WNEON deployed: ${name} (${symbol})`);
        
        // Test deposit functionality
        await wneon.deposit({ value: ethers.parseEther("1") });
        const balance = await wneon.balanceOf(deployer.address);
        console.log(`   ✅ Deposit test: ${ethers.formatEther(balance)} WNEON`);
        
    } catch (error) {
        console.log(`   ❌ WNEON test failed: ${error.message}`);
    }
    
    // === TEST 2: REAL WNEON APPROACH ===
    console.log("\n📊 === TEST 2: REAL WNEON APPROACH ===");
    console.log("✅ Pros:");
    console.log("   - Uses actual Neon infrastructure");
    console.log("   - Real wrapped token functionality");
    console.log("   - Production-ready for Neon network");
    console.log("❌ Cons:");
    console.log("   - Requires Neon DevNet connection");
    console.log("   - Need real NEON tokens for testing");
    console.log("   - Complex setup for development");
    
    const REAL_WNEON_ADDRESS = "0x11adC2d986E334137b9ad0a0F290771F31e9517F";
    
    if (network.chainId === 245022926n) {
        console.log("\n🔄 Testing real WNEON connection...");
        try {
            const realWNEON = await ethers.getContractAt("WNEON", REAL_WNEON_ADDRESS);
            const name = await realWNEON.name();
            const symbol = await realWNEON.symbol();
            console.log(`   ✅ Real WNEON connected: ${name} (${symbol})`);
            
            const balance = await realWNEON.balanceOf(deployer.address);
            console.log(`   📊 Current balance: ${ethers.formatEther(balance)} WNEON`);
            
        } catch (error) {
            console.log(`   ❌ Real WNEON test failed: ${error.message}`);
        }
    } else {
        console.log("   ⚠️  Not connected to Neon DevNet - skipping real WNEON test");
    }
    
    // === TEST 3: CUSTOM BASE TOKEN APPROACH ===
    console.log("\n📊 === TEST 3: CUSTOM BASE TOKEN APPROACH ===");
    console.log("✅ Pros:");
    console.log("   - Completely custom ecosystem");
    console.log("   - All tokens created from scratch");
    console.log("   - Full control over tokenomics");
    console.log("   - Easy to understand and maintain");
    console.log("❌ Cons:");
    console.log("   - Not using real Neon infrastructure");
    console.log("   - Requires custom token contracts");
    console.log("   - Less familiar to Neon users");
    
    console.log("\n🔄 Testing BaseToken deployment...");
    try {
        const BaseTokenFactory = await ethers.getContractFactory("BaseToken");
        const baseToken = await BaseTokenFactory.deploy(
            "Platform Base Token",
            "BASE",
            ethers.parseEther("1000000"),
            18
        );
        await baseToken.waitForDeployment();
        
        const name = await baseToken.name();
        const symbol = await baseToken.symbol();
        const totalSupply = await baseToken.totalSupply();
        
        console.log(`   ✅ BaseToken deployed: ${name} (${symbol})`);
        console.log(`   📊 Total supply: ${ethers.formatEther(totalSupply)}`);
        
        // Test minting
        await baseToken.mint(deployer.address, ethers.parseEther("1000"));
        const balance = await baseToken.balanceOf(deployer.address);
        console.log(`   ✅ Mint test: ${ethers.formatEther(balance)} BASE`);
        
    } catch (error) {
        console.log(`   ❌ BaseToken test failed: ${error.message}`);
    }
    
    // === RECOMMENDATION ===
    console.log("\n🎯 === RECOMMENDATIONS ===");
    
    if (network.chainId === 245022926n) {
        console.log("🌟 RECOMMENDED: Real WNEON Approach");
        console.log("   You're connected to Neon DevNet - use real WNEON!");
        console.log("   Command: node deploy-with-real-wneon.js");
    } else {
        console.log("🌟 RECOMMENDED: Custom Base Token Approach");
        console.log("   For development/testing - cleaner custom ecosystem");
        console.log("   Command: node deploy-own-tokens.js");
        console.log("\n🔄 ALTERNATIVE: Current WNEON Approach");
        console.log("   If you want to simulate real environment");
        console.log("   Command: node deploy-all-simplified.js");
    }
    
    console.log("\n📝 === SUMMARY TABLE ===");
    console.log("┌─────────────────────────────────────────────────────────────────┐");
    console.log("│                       APPROACH COMPARISON                       │");
    console.log("├─────────────────────────────────────────────────────────────────┤");
    console.log("│ Current (WNEON + Mock)  │ Real WNEON        │ Custom BASE        │");
    console.log("├─────────────────────────────────────────────────────────────────┤");
    console.log("│ ✅ Already working      │ ✅ Production-ready │ ✅ Clean design    │");
    console.log("│ ✅ Tested              │ ✅ Real infrastructure │ ✅ Full control │");
    console.log("│ ❌ Mixed logic         │ ❌ Requires Neon net │ ❌ Custom tokens  │");
    console.log("│ ❌ Confusing           │ ❌ Complex setup     │ ❌ Not real infra  │");
    console.log("└─────────────────────────────────────────────────────────────────┘");
    
    console.log("\n🎉 === TESTING COMPLETED ===");
}

// Функция для автоматического выбора подхода
async function autoSelectApproach() {
    console.log("🤖 === AUTO-SELECTING BEST APPROACH ===\n");
    
    const network = await ethers.provider.getNetwork();
    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    if (network.chainId === 245022926n) {
        console.log("🎯 Auto-selected: Real WNEON Approach");
        console.log("   Reason: Connected to Neon DevNet");
        
        const { deployWithRealWNEON } = require("./deploy-with-real-wneon.js");
        return await deployWithRealWNEON();
        
    } else {
        console.log("🎯 Auto-selected: Custom Base Token Approach");
        console.log("   Reason: Development/test environment");
        
        const { deployOwnTokens } = require("./deploy-own-tokens.js");
        return await deployOwnTokens();
    }
}

// Функция для получения рекомендаций
function getRecommendations() {
    console.log("\n💡 === RECOMMENDATIONS FOR DIFFERENT SCENARIOS ===\n");
    
    console.log("🔬 FOR DEVELOPMENT & TESTING:");
    console.log("   Use: Custom Base Token Approach");
    console.log("   Why: Clean, predictable, easy to debug");
    console.log("   Command: node deploy-own-tokens.js");
    
    console.log("\n🌐 FOR NEON DEVNET TESTING:");
    console.log("   Use: Real WNEON Approach");
    console.log("   Why: Tests real infrastructure");
    console.log("   Command: node deploy-with-real-wneon.js");
    
    console.log("\n🚀 FOR PRODUCTION:");
    console.log("   Use: Real WNEON + Real Tokens");
    console.log("   Why: Use actual token contracts");
    console.log("   Note: Integrate with real USDC, USDT, etc.");
    
    console.log("\n📚 FOR EDUCATION/DEMO:");
    console.log("   Use: Current WNEON + Mock Approach");
    console.log("   Why: Shows both real and mock concepts");
    console.log("   Command: node deploy-all-simplified.js");
}

module.exports = {
    testTokenApproaches,
    autoSelectApproach,
    getRecommendations
};

// Запуск, если файл вызван напрямую
if (require.main === module) {
    testTokenApproaches()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
} 