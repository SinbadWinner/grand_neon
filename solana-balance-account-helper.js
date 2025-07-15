const { createBalanceAccountInstruction } = require("@neonevm/solana-sign");

async function ensureNeonBalanceAccount(connection, solanaUser, chainId) {
    const account = await connection.getAccountInfo(solanaUser.balanceAddress);
    if (account === null) {
        return createBalanceAccountInstruction(
            solanaUser.neonEvmProgram,
            solanaUser.publicKey,
            solanaUser.neonWallet,
            chainId
        );
    }
    return null;
}

module.exports = { ensureNeonBalanceAccount }; 