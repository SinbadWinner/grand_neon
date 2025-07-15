const { createBalanceAccountInstruction } = require("@neonevm/solana-sign");
const { initSolana } = require("./solana-init");

async function sendScheduledTx({ transactionData, preparatoryInstructions = [] }) {
    const { connection, proxyApi, solanaUser, chainId } = await initSolana();
    const nonce = Number(await proxyApi.getTransactionCount(solanaUser.neonWallet));
    const transactionGas = await proxyApi.estimateScheduledTransactionGas({
        solanaPayer: solanaUser.publicKey,
        transactions: [transactionData],
        preparatorySolanaTransactions: preparatoryInstructions.length ? [{ instructions: preparatoryInstructions }] : undefined
    });
    const { scheduledTransaction } = await proxyApi.createScheduledTransaction({
        transactionGas,
        transactionData,
        nonce
    });
    // Проверка и создание Neon balance account
    const account = await connection.getAccountInfo(solanaUser.balanceAddress);
    if (account === null) {
        scheduledTransaction.instructions.unshift(
            createBalanceAccountInstruction(
                solanaUser.neonEvmProgram,
                solanaUser.publicKey,
                solanaUser.neonWallet,
                chainId
            )
        );
    }
    const { blockhash } = await connection.getLatestBlockhash();
    scheduledTransaction.recentBlockhash = blockhash;
    scheduledTransaction.sign({ publicKey: solanaUser.publicKey, secretKey: solanaUser.keypair.secretKey });
    const signature = await connection.sendRawTransaction(scheduledTransaction.serialize());
    return signature;
}

module.exports = { sendScheduledTx }; 