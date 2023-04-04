export const config = {
    anticaptchaApikey: "6e4x4776cc858485baac8a886cd0b748cf9", // paste your apikey
    txAmount: { from: 500, to: 1000 }, // random uSei amount limits to send
    delayBetweenTransactions: 0, // milliseconds
    timeToWaitForFaucetTokens: 40, // minutes
    checkGitftsEveryTxCount: 5,
    waitForGiftsToBeMinted: false, // false recommended
    recheckMode: false, // true/false, check old mnemonics for available gifts for send\mint
    unboxMode: true
}