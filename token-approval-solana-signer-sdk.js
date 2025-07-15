const web3 = require("@solana/web3.js");
const ethers = require("ethers");
const bs58 = require("bs58");
const { NeonProxyRpcApi, createBalanceAccountInstruction } = require("@neonevm/solana-sign");
require("dotenv").config();
 
const NEON_RPC = 'https://devnet.neonevm.org/sol';
const connection = new web3.Connection('https://api.devnet.solana.com', 'confirmed');
const proxyApi = new NeonProxyRpcApi(NEON_RPC);

const USDC_ADDRESS = '0x512E48836Cd42F3eB6f50CEd9ffD81E0a7F15103';
const USDC_ABI = [{"inputs":[{"internalType":"bytes32","name":"_tokenMint","type":"bytes32"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"bytes32","name":"spender","type":"bytes32"},{"indexed":false,"internalType":"uint64","name":"amount","type":"uint64"}],"name":"ApprovalSolana","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"bytes32","name":"to","type":"bytes32"},{"indexed":false,"internalType":"uint64","name":"amount","type":"uint64"}],"name":"TransferSolana","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"spender","type":"bytes32"},{"internalType":"uint64","name":"amount","type":"uint64"}],"name":"approveSolana","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"who","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burn","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"from","type":"bytes32"},{"internalType":"uint64","name":"amount","type":"uint64"}],"name":"claim","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"from","type":"bytes32"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint64","name":"amount","type":"uint64"}],"name":"claimTo","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"tokenMint","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"to","type":"bytes32"},{"internalType":"uint64","name":"amount","type":"uint64"}],"name":"transferSolana","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}];
const USDC = new ethers.Contract(
    USDC_ADDRESS,
    USDC_ABI,
    proxyApi
);

const solanaPrivateKey = bs58.default.decode(process.env.PRIVATE_KEY_SOLANA);
const keypair = web3.Keypair.fromSecretKey(solanaPrivateKey);

async function init() {
    const {chainId, solanaUser} = await proxyApi.init(keypair);
    if (await connection.getBalance(solanaUser.publicKey) == 0) {
        console.error('\nPlease add some SOLs to', solanaUser.publicKey.toBase58());
        process.exit();
    }

    console.log('Current USDC approval of ', solanaUser.neonWallet, 'is', await USDC.allowance(solanaUser.neonWallet, solanaUser.neonWallet));

    const nonce = Number(await proxyApi.getTransactionCount(solanaUser.neonWallet));
    const transactionData = {
        from: solanaUser.neonWallet,
        to: USDC_ADDRESS,
        data: USDC.interface.encodeFunctionData("approve", [solanaUser.neonWallet, Math.floor(Date.now() / 1000)])
    };

    let transactionGas = await proxyApi.estimateScheduledTransactionGas({
        solanaPayer: solanaUser.publicKey,
        transactions: [transactionData]
    });
      
    const { scheduledTransaction } = await proxyApi.createScheduledTransaction({
        transactionGas,
        transactionData,
        nonce
    });

    const account = await connection.getAccountInfo(solanaUser.balanceAddress);
    if (account === null) {
        const { neonEvmProgram, publicKey, neonWallet, chainId } = solanaUser;
        scheduledTransaction.instructions.unshift(createBalanceAccountInstruction(neonEvmProgram, publicKey, neonWallet, chainId));
    }

    const { blockhash } = await connection.getLatestBlockhash();
    scheduledTransaction.recentBlockhash = blockhash;
    scheduledTransaction.sign({ publicKey: solanaUser.publicKey, secretKey: solanaUser.keypair.secretKey });

    const signature = await connection.sendRawTransaction(scheduledTransaction.serialize());
    console.log('\n Scheduled transaction signature', signature);

    console.log('\n Awaiting transaction finalization on Neon EVM ...');
    await asyncTimeout(60000);

    const neon_getTransactionBySenderNonceRequest = await fetch(NEON_RPC, {
        method: 'POST',
        body: JSON.stringify({"method":"neon_getTransactionBySenderNonce","params":[solanaUser.neonWallet, nonce],"id":1,"jsonrpc":"2.0"}),
        headers: { 'Content-Type': 'application/json' }
    });
    const neon_getTransactionBySenderNonce = await neon_getTransactionBySenderNonceRequest.json();
    console.log('Neon EVM transaction hash', neon_getTransactionBySenderNonce.result.hash);

    console.log('Current USDC approval of ', solanaUser.neonWallet, 'is', await USDC.allowance(solanaUser.neonWallet, solanaUser.neonWallet));
}
init();

async function asyncTimeout(timeout) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), timeout)
    })
} 