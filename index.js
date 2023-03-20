import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { getSigningClient, getQueryClient } from "@sei-js/core";
import { calculateFee } from "@cosmjs/stargate";
import { checkEligibility, mintGift, sendGift, waitForEligibility, waitForGiftToBoMinted } from "./gifts.js";
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
            const balance = await queryClient.cosmos.bank.v1beta1.allBalances({ address });

            if (sure) {
                if (balance?.balances.length > 0) {
                    return balance?.balances.find(token => token.denom === coin)?.amount;
                } else await timeout(1000)
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
            let data = await client.getSequence(address).catch(err => console.log(err))

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

    for (let i = 0; i < walletData?.numGifts; i++) {
        const walletGift = await generateWallet();
        saveMnemonic(walletGift.mnemonic, 'gifts.txt')
        let giftWalletAddress = await getAddressFromMnemonic(walletGift.mnemonic)
        console.log(`Gift Wallet: ${giftWalletAddress}`);

        await sendGift(txWalletAddress, giftWalletAddress);
        await timeout(10000);
        await mintGift(txWalletAddress, giftWalletAddress);
        // await waitForGiftToBoMinted(giftWalletAddress);
    }
}



(async () => {
    while (true) {
        const walletTx = await generateWallet();
        const client = await getSigningClient(RPC, walletTx);
        let txWalletAddress = await getAddressFromMnemonic(walletTx.mnemonic);
        console.log(`Tx Wallet: ${txWalletAddress}`);

        let isFundsRequested = await getTokensFromFaucet(txWalletAddress);
        if (isFundsRequested) {

            let isFunded = await waitForFaucetTokens(client, txWalletAddress);
            if (isFunded) {
                saveMnemonic(walletTx.mnemonic, 'senders.txt');

                try {
                    let sufficientBalance = true;
                    console.log('Sending txs...');

                    while (sufficientBalance) {
                        let randomWallet = await generateWallet()
                        let randomWalletAddress = await getAddressFromMnemonic(randomWallet.mnemonic)

                        const amount = { amount: generateRandomAmount(500, 1000), denom: 'usei' };
                        const fee = calculateFee(80000, "0.02usei");
                        try {
                            const response = await client.sendTokens(txWalletAddress, randomWalletAddress, [amount], fee);
                            //console.log(`TX data: https://sei.explorers.guru/transaction/${response.transactionHash}`);
                        } catch (e) {
                            if (e.message?.includes('insufficient')) {
                                sufficientBalance = false;
                            } else console.error(`Error while sending tx: ${e.message}`)
                        }

                        // txWalletBalance = await getBalance(txWalletAddress, 'usei', true);
                        await timeout(config.delayBetweenTransactions)
                    }
                    let txCount = await getTxCount(client, txWalletAddress)
                    console.log('Sent tx:', txCount);

                    await waitForEligibility(txWalletAddress, txCount)
                    await handleGifts(txWalletAddress)

                } catch (err) { console.log(err.message) }
            }
        } else console.log('Captcha is not solved, wallet skipped');

        console.log('-'.repeat(80));
    }
})()