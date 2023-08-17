export const config = {
    anticaptchaApikey: "", // paste your apikey
    txAmount: { from: 500, to: 1000 }, // random uSei amount limits to send
    delayBetweenTransactions: 0, // milliseconds
    timeToWaitForFaucetTokens: 40, // minutes
    checkGitftsEveryTxCount: 5,
    waitForGiftsToBeMinted: false, // false recommended
    recheckMode: false,
    unboxMode: false,
    airdropMode: true,
    proxy: 'ip:port:login:password'
}