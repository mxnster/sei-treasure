import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { getSigningClient, getQueryClient } from "@sei-js/core";
import { calculateFee } from "@cosmjs/stargate";
import { checkEligibility, checkGiftStatus, mintGift, sendGift, waitForEligibility, waitForGiftToBoMinted } from "./gifts.js";
import { getTokensFromFaucet } from "./faucet.js";
import { config } from "./config.js";
import consoleStamp from 'console-stamp';
import fs from "fs";


const RPC = "https://rpc.atlantic-2.seinetwork.io/";
const REST = "https://rest.atlantic-2.seinetwork.io/";
const queryClient = await getQueryClient(REST);

consoleStamp(console, { format: ':date(HH:MM:ss)' });
export const timeout = ms => new Promise(res => setTimeout(res, ms));
const saveMnemonic = (mnemonic, path) => fs.appendFileSync(`./mnemonics/${path}`, `${mnemonic}\n`, "utf8");
const parseFile = fileName => fs.readFileSync(fileName, "utf8").split('\n').map(str => str.trim()).filter(str => str.length > 10);
const generateRandomAmount = (min, max) => (Math.random() * (max - min) + min).toFixed(0);
const generateWallet = async () => await DirectSecp256k1HdWallet.generate(12, { prefix: "sei" })

async function getAddressFromMnemonic(mnemonic) {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix: 'sei' });
    const account = await wallet.getAccounts();
    return account[0].address;
};

async function getBalance(address, coin = 'usei', sure = false) {
    try {
        for (let i = 0; i < 50; i++) {
            const balance = await queryClient.cosmos.bank.v1beta1.allBalances({ address }).catch(error => console.log('Check balance error:', error.code));

            if (sure) {
                if (balance?.balances.length > 0) {
                    return balance?.balances.find(token => token.denom === coin)?.amount;
                } else await timeout(2000)
            } else return balance?.balances.find(token => token.denom === coin)?.amount;
        }
    } catch (err) {
        console.log(err);
    }
};

async function waitForFaucetTokens(client, address) {
    console.log('Waiting for coins from faucet...');

    const pause = 5000;
    await timeout(pause);

    for (let i = 0; i < config.timeToWaitForFaucetTokens * 60 * 1000 / pause; i++) {
        let balance = await getBalance(address)

        if (balance) {
            let account = await client.getAccount(address);
            if (account) return true

        } else await timeout(pause)
    }

    console.log(`Waiting for coins has been stopped, timeout of ${config.timeToWaitForFaucetTokens} minutes exceeded`);

    return false
}

async function getTxCount(client, address) {
    for (let i = 0; i < 20; i++) {
        try {
            let data = await client.getSequence(address).catch(err => console.log('Check tx count error:', err.code))

            if (data) {
                return data?.sequence
            } else await timeout(2000)
        } catch (err) {
            console.log(err.message);
        }
    }
}

async function handleGifts(txWalletAddress) {
    let walletData = await checkEligibility(txWalletAddress);
    let needToSend = walletData?.numGifts - walletData?.giftsSent;

    console.log(`Tx count: ${walletData.transactions}, gifts to send: ${needToSend}`);

    for (let i = 0; i < needToSend; i++) {
        const walletGift = await generateWallet();
        saveMnemonic(walletGift.mnemonic, 'gifts.txt')
        let giftWalletAddress = await getAddressFromMnemonic(walletGift.mnemonic)
        console.log(`GIFT Wallet: ${giftWalletAddress}`);

        await sendGift(txWalletAddress, giftWalletAddress);
        await timeout(10000);
        await mintGift(txWalletAddress, giftWalletAddress);
        config.waitForGiftsToBeMinted && await waitForGiftToBoMinted(giftWalletAddress);
    }
}

async function recheckMode() {
    let senders = parseFile('./mnemonics/senders.txt');

    for (let senderMnemonic of senders) {
        let address = await getAddressFromMnemonic(senderMnemonic)
        console.log(`TX wallet: ${address}`);
        await handleGifts(address, true)
        await timeout(4000)
        console.log('-'.repeat(90));
    }

    let gifts = parseFile('./mnemonics/gifts.txt');

    for (let giftMnemonic of gifts) {
        let giftWalletAddress = await getAddressFromMnemonic(giftMnemonic);
        console.log(`GIFT wallet: ${giftWalletAddress}`);
        console.log('Mnemonic: ', giftMnemonic);

        let giftData = await checkGiftStatus(giftWalletAddress);
        console.log('Gift status:', giftData?.giftStatus || 'address has not been given a gift.');

        if (giftData?.giftStatus == 'gifted') {
            await mintGift(giftData?.senderAddress, giftData?.recipientAddress);
            config.waitForGiftsToBeMinted && await waitForGiftToBoMinted(giftWalletAddress);
        }

        await timeout(5000);
        console.log('-'.repeat(90));
    }
}



(async () => {
    if (!config.recheckMode) {
        while (true) {
            try {
                const walletTx = await generateWallet();
                const client = await getSigningClient(RPC, walletTx);
                let txWalletAddress = await getAddressFromMnemonic(walletTx.mnemonic);
                console.log(`Tx Wallet: ${txWalletAddress}`);

                let isFundsRequested = await getTokensFromFaucet(txWalletAddress);
                if (isFundsRequested) {

                    let isFunded = await waitForFaucetTokens(client, txWalletAddress);
                    if (isFunded) {
                        saveMnemonic(walletTx.mnemonic, 'senders.txt');

                        let sufficientBalance = true;
                        let counter = 0;
                        console.log('Sending txs...');

                        while (sufficientBalance) {
                            let randomWallet = await generateWallet()
                            let randomWalletAddress = await getAddressFromMnemonic(randomWallet.mnemonic)
        
                            const amount = { amount: generateRandomAmount(config.txAmount.from, config.txAmount.to), denom: 'usei' };
                            const fee = calculateFee(90000, "0.02usei");
                            try {
                                const response = await client.sendTokens(txWalletAddress, randomWalletAddress, [amount], fee);
                                const nonceObject = response.events.find(event => event.type === 'tx' && event.attributes[0].key === 'acc_seq');
                                const nonce = Number(nonceObject.attributes[0].value.split('/')[1]) + 1;
                                counter++;
                                console.log(`TX [${nonce}]: https://sei.explorers.guru/transaction/${response.transactionHash}`);
                            } catch (e) {
                                if (e.message?.includes('insufficient')) {
                                    sufficientBalance = false;
                                } else {
                                    // console.error(`Error while sending tx: ${e.message}`)
                                    await timeout(5000)
                                }
                            }

                            if (counter == config.checkGitftsEveryTxCount) {
                                handleGifts(txWalletAddress)
                                counter = 0
                            }

                            // txWalletBalance = await getBalance(txWalletAddress, 'usei', true);
                            await timeout(config.delayBetweenTransactions)
                        }
                        let txCount = await getTxCount(client, txWalletAddress)
                        console.log('Sent tx:', txCount);

                        await waitForEligibility(txWalletAddress, txCount)
                        await handleGifts(txWalletAddress)
                    }
                } else console.log('Captcha is not solved, wallet skipped');

                console.log('-'.repeat(80));
            } catch (err) { console.log(err.message) }
        }
    } else await recheckMode()
})()
