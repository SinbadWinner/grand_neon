const { createApproveInstruction } = require('@solana/spl-token');

function buildApproveInstruction(tokenATA, delegateAddress, owner, amount) {
    return createApproveInstruction(tokenATA, delegateAddress, owner, amount);
}

module.exports = { buildApproveInstruction }; 