const web3 = require("@solana/web3.js");
const bs58 = require("bs58");
const { NeonProxyRpcApi } = require("@neonevm/solana-sign");
require("dotenv").config();

const NEON_RPC = 'https://devnet.neonevm.org/sol';
const connection = new web3.Connection('https://api.devnet.solana.com', 'confirmed');
const proxyApi = new NeonProxyRpcApi(NEON_RPC);

async function initSolana() {
    const solanaPrivateKey = bs58.decode(process.env.PRIVATE_KEY_SOLANA);
    const keypair = web3.Keypair.fromSecretKey(solanaPrivateKey);
    const { chainId, solanaUser } = await proxyApi.init(keypair);
    if (await connection.getBalance(solanaUser.publicKey) === 0) {
        throw new Error(`Please add some SOLs to ${solanaUser.publicKey.toBase58()}`);
    }
    return { connection, proxyApi, keypair, solanaUser, chainId };
}

module.exports = { initSolana }; 