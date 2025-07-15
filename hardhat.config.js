require('@nomicfoundation/hardhat-ethers');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          evmVersion: "cancun",
          viaIR: true
        }
      },
      {
        version: "0.6.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.16",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.4.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  networks: {
    neondevnet: {
      url: process.env.NEON_EVM_NODE || 'https://devnet.neonevm.org',
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
      chainId: 245022926,
      gas: 3000000,
      gasPrice: 1000000000, // 1 Gwei
      timeout: 60000
    },
    hardhat: {
      chainId: 1337,
      gas: 12000000,
      gasPrice: 'auto',
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 10
      }
    }
  },
  defaultNetwork: "hardhat",
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
}; 