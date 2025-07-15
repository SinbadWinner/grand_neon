const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'dapp-config.json');

// Default configuration
const defaultConfig = {
  // Network Configuration
  network: "hardhat",
  chainId: 1337,
  
  // PancakeSwap Contracts
  pancakeswap: {
    factory: null,
    router: null,
    wneon: null
  },
  
  // Raydium Contracts
  raydium: {
    swapContract: null,
    poolContract: null
  },
  
  // Test Tokens
  tokens: {
    usdc: null,
    usdt: null,
    btc: null,
    eth: null
  },
  
  // NFT Rewards
  nft: {
    rewardsContract: null
  },
  
  // Deployment Status
  deploymentStatus: {
    pancakeswap: "pending",
    raydium: "pending",
    tokens: "pending", 
    nft: "pending"
  },
  
  // Deployment Timestamp
  deployedAt: new Date().toISOString()
};

// Load configuration from file
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return { ...defaultConfig, ...JSON.parse(configData) };
    }
  } catch (error) {
    console.log('Warning: Could not load config file, using default config');
  }
  return { ...defaultConfig };
}

// Save configuration to file
function saveConfig(config) {
  try {
    config.deployedAt = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✓ Configuration saved to file');
  } catch (error) {
    console.error('Error saving config:', error.message);
  }
}

// Load configuration
const config = loadConfig();

// Add helper methods
config.save = function() {
  saveConfig(this);
};

config.updatePancakeSwap = function(addresses) {
  this.pancakeswap = { ...this.pancakeswap, ...addresses };
  this.deploymentStatus.pancakeswap = "completed";
  this.save();
};

config.updateTokens = function(addresses) {
  this.tokens = { ...this.tokens, ...addresses };
  this.deploymentStatus.tokens = "completed";
  this.save();
};

config.updateRaydium = function(addresses) {
  this.raydium = { ...this.raydium, ...addresses };
  this.deploymentStatus.raydium = "completed";
  this.save();
};

config.updateNFT = function(addresses) {
  this.nft = { ...this.nft, ...addresses };
  this.deploymentStatus.nft = "completed";
  this.save();
};

module.exports = config; 