const web3 = require("@solana/web3.js");
const { 
    getAssociatedTokenAddress,
    getAccount,
    createApproveInstruction,
    createAssociatedTokenAccountInstruction,
    TokenAccountNotFoundError
} = require('@solana/spl-token');    
const ethers = require("ethers");
const bs58 = require("bs58");
const { NeonProxyRpcApi, createBalanceAccountInstruction } = require("@neonevm/solana-sign");
require("dotenv").config();


const NEON_RPC = 'https://devnet.neonevm.org/sol';
const connection = new web3.Connection('https://api.devnet.solana.com', 'confirmed');
const proxyApi = new NeonProxyRpcApi(NEON_RPC);
const NEON_EVM_PROGRAM = 'eeLSJgWzzxrqKv1UxtRVVH8FX3qCQWUs9QuAjJpETGU'; // devnet

const USDC_ADDRESS = '0x512E48836Cd42F3eB6f50CEd9ffD81E0a7F15103';
const USDC_ABI = [{"inputs":[{"internalType":"bytes32","name":"_tokenMint","type":"bytes32"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"bytes32","name":"spender","type":"bytes32"},{"indexed":false,"internalType":"uint64","name":"amount","type":"uint64"}],"name":"ApprovalSolana","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"bytes32","name":"to","type":"bytes32"},{"indexed":false,"internalType":"uint64","name":"amount","type":"uint64"}],"name":"TransferSolana","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"spender","type":"bytes32"},{"internalType":"uint64","name":"amount","type":"uint64"}],"name":"approveSolana","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"who","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burn","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"from","type":"bytes32"},{"internalType":"uint64","name":"amount","type":"uint64"}],"name":"claim","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"from","type":"bytes32"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint64","name":"amount","type":"uint64"}],"name":"claimTo","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"tokenMint","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"to","type":"bytes32"},{"internalType":"uint64","name":"amount","type":"uint64"}],"name":"transferSolana","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}];
const USDC = new ethers.Contract(
    USDC_ADDRESS,
    USDC_ABI,
    proxyApi
);

const solanaPrivateKey = bs58.decode(process.env.PRIVATE_KEY_SOLANA);
const keypair = web3.Keypair.fromSecretKey(solanaPrivateKey);

async function init() {
    // This demo demonstrate a SPLToken transfer from native Solana user to Neon EVM user
    // the tokens are being sent from Solana user's ATA account
    // the tokens are being received to Neon EVM user address in the form of USDC erc20forspl balance

    const {chainId, solanaUser} = await proxyApi.init(keypair);
    if (await connection.getBalance(solanaUser.publicKey) == 0) {
        console.error('\nPlease add some SOLs to', solanaUser.publicKey.toBase58());
        process.exit();
    }

    const usdcTokenMint = await USDC.tokenMint();
    const usdcContractPDA = calculateContractAccount(USDC_ADDRESS, new web3.PublicKey(NEON_EVM_PROGRAM))[0];
    const receiver = ethers.Wallet.createRandom();
    
    const solanaUserUSDC_ATA = await getAssociatedTokenAddress(
    new web3.PublicKey(ethers.encodeBase58(usdcTokenMint)),
    solanaUser.publicKey,
    true
    );

    let ataInfo;
    try {
        ataInfo = await getAccount(connection, solanaUserUSDC_ATA);
    } catch (e) {
        if (e instanceof TokenAccountNotFoundError) {
            console.log('Creating missing USDC ATA...');
            const ataIx = createAssociatedTokenAccountInstruction(
                keypair.publicKey,             // payer
                solanaUserUSDC_ATA,            // associated token address to create
                keypair.publicKey,             // owner
                new web3.PublicKey(ethers.encodeBase58(usdcTokenMint)) // USDC mint
            );
            const ataTx = new web3.Transaction().add(ataIx);
            const signature = await connection.sendTransaction(ataTx, [keypair]);
            await connection.confirmTransaction(signature, 'confirmed');
            console.log('ATA created:', signature);

            ataInfo = await getAccount(connection, solanaUserUSDC_ATA); // retry after creation
        } else {
            throw e;
        }
    }


    const senderUsdcBalance = ataInfo.amount;
    if (senderUsdcBalance == 0) {
        console.error('\nPlease add some USDC to', solanaUser.publicKey.toBase58());
        process.exit();
    }
    const receiverUsdcBalance = await USDC.balanceOf(receiver.address);
    console.log(senderUsdcBalance, 'senderUsdcBalance');
    console.log(receiverUsdcBalance, 'receiverUsdcBalance');

    const nonce = Number(await proxyApi.getTransactionCount(solanaUser.neonWallet));
    const transactionData = {
        from: solanaUser.neonWallet,
        to: USDC_ADDRESS,
        data: USDC.interface.encodeFunctionData("transfer", [receiver.address, 1 * 10 ** 6]) // building tx calldata of transfer 1 USDC
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

    console.log(ataInfo.delegate)
    console.log(usdcContractPDA)

    // if delegate has not be given from solanaUser's USDC ATA to the PDA Contract of USDC then also include approval instruction
    if (ataInfo.delegate == null || ataInfo.delegate.toBase58() != usdcContractPDA.toBase58() || ataInfo.delegatedAmount == 0) {
        console.log('Add approval instruction');
        scheduledTransaction.instructions.unshift(
            createApproveInstruction(
                solanaUserUSDC_ATA,
                usdcContractPDA, // delegate
                solanaUser.publicKey,
                '18446744073709551615' // max uint64 approval ( not necessary to be max uint64 )
            )
        );
    }

    // if balance address is missing then add instruction to create it
    const account = await connection.getAccountInfo(solanaUser.balanceAddress);
    if (account === null) {
        const { neonEvmProgram, publicKey, neonWallet, chainId } = solanaUser;
        scheduledTransaction.instructions.unshift(createBalanceAccountInstruction(neonEvmProgram, solanaUser.publicKey, solanaUser.neonWallet, chainId));
    }

    const { blockhash } = await connection.getLatestBlockhash();
    scheduledTransaction.recentBlockhash = blockhash;
    scheduledTransaction.sign({ publicKey: solanaUser.publicKey, secretKey: solanaUser.keypair.secretKey });

    // submit the scheduled transaction to Solana
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

    const ataInfoAfter = await getAccount(connection, solanaUserUSDC_ATA);
    const senderUsdcBalanceAfter = ataInfoAfter.amount;
    const receiverUsdcBalanceAfter = await USDC.balanceOf(receiver.address);

    console.log(senderUsdcBalanceAfter, 'senderUsdcBalanceAfter');
    console.log(receiverUsdcBalanceAfter, 'receiverUsdcBalanceAfter');
}
init();

async function asyncTimeout(timeout) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), timeout)
    })
}

function calculateContractAccount(contractEvmAddress, neonEvmProgram) {
    const neonContractAddressBytes = Buffer.from(isValidHex(contractEvmAddress) ? contractEvmAddress.replace(/^0x/i, '') : contractEvmAddress, 'hex')
    const seed = [
        new Uint8Array([0x03]),
        new Uint8Array(neonContractAddressBytes)
    ]

    return web3.PublicKey.findProgramAddressSync(seed, neonEvmProgram)
}

function isValidHex(hex) {
    const isHexStrict = /^(0x)?[0-9a-f]*$/i.test(hex.toString())
    if (!isHexStrict) {
        throw new Error(`Given value "${hex}" is not a valid hex string.`)
    } else {
        return isHexStrict
    }
} 