import axios from 'axios';
import { timeout } from './index.js';

export async function checkEligibility(address) {
    let res = await axios
        .get(`https://atlantic-2.sunken-treasure.seinetwork.io/eligibility?address=${address}`)
        .catch(async error => console.log(error?.response?.data?.message));

    if (res?.data) {
        res?.data?.status !== 'success' && console.log(res?.data?.message);
        await timeout(5000)
        return res.data.data
    } else {
        await timeout(10000)
        return await checkEligibility(address)
    }
}

export async function checkGiftStatus(address) {
    let res = await axios
        .get(`https://atlantic-2.sunken-treasure.seinetwork.io/gift?recipientAddress=${address}`)
        .catch(async error => console.log(error?.response?.data?.message));

    if (res?.data) {
        // console.log(res.data);
        return res.data.data
    } else {
        await timeout(10000)
        return await checkGiftStatus(address)
    }
}

export async function waitForEligibility(address, txCount) {
    console.log('Waiting for eligibility...');
    await timeout(60000)

    for (let i = 0; i < 50; i++) {
        let data = await checkEligibility(address)

        if (data?.transactions > txCount * 0.6) { // percent of "missed" txs
            return true
        } else await timeout(10000)
    }

    console.log('Waiting for eligibility stopped, timeout of 10 minutes exceeded');
}

export async function sendGift(senderAddress, recipientAddress) {
    let res = await axios(`https://atlantic-2.sunken-treasure.seinetwork.io/create-gift`, {
        method: "POST",
        data: {
            senderAddress,
            recipientAddress
        }
    }).catch(async error => {
        console.log(error?.response?.data?.message);
        if (error?.response?.data?.message == 'Too Many Requests') {
            await timeout(5000)
            await sendGift(senderAddress, recipientAddress)
        }
    });


    if (res?.data) {
        console.log(`Sending gift to ${recipientAddress} - ${res?.data?.status}`);
        res?.data?.status !== 'success' && console.log(res?.data?.message);

        return res.data
    }
}

export async function checkNFTs(address) {
    let res = await axios
        .get(`https://atlantic-2.sunken-treasure.seinetwork.io/nfts?address=${address}`)
        .catch(async error => console.log(error?.response?.data?.message));

    if (res?.data) {
        // console.log(res.data);
        return res.data.data
    } else {
        await timeout(5000)
        return await checkNFTs(address)
    }
}

export async function openBox(address) {
    let res = await axios(`https://atlantic-2.sunken-treasure.seinetwork.io/reveal`, {
        method: "POST",
        data: { address }
    }).catch(async error => {
        console.log(error?.response?.data?.message);
        if (error?.response?.data?.message == 'Too Many Requests') {
            await timeout(5000)
            await openBox(address)
        }
    });


    if (res?.data) {
        console.log(`Unboxing from ${address} - ${res?.data?.status}`);
        res?.data?.status !== 'success' && console.log(res?.data?.message);

        return res.data
    }
}

export async function mintGift(senderAddress, recipientAddress) {
    let res = await axios(`https://atlantic-2.sunken-treasure.seinetwork.io/claim-gift`, {
        method: "POST",
        data: {
            "senderAddress": senderAddress,
            "recipientAddress": recipientAddress,
            "code": "WEJaTkRVRHdNUlJFd1BHby1CVlZ2WlRFQlM2aW1wVG9yYXA5VEI4WERBamItOjE2NzkxNDI2OTYxNzc6MTowOmFjOjE",
            "state": "5Dg4wVwv6D6X.rpScdbFNnK6kZu53MZX"
        }
    }).catch(async error => {
        console.log(error?.response?.data?.message);
        if (error?.response?.data?.message == 'Too Many Requests') {
            await timeout(10000)
            await mintGift(senderAddress, recipientAddress)
        }
    });

    if (res?.data) {
        console.log('Minting gift -', res?.data?.status);
        res?.data?.status !== 'success' && console.log(res?.data?.message);

        return res.data
    }
}


export async function waitForGiftToBoMinted(address) {
    console.log('Waiting for gift to be minted...');

    for (let i = 0; i < 120; i++) {
        let data = await checkGiftStatus(address)

        if (data?.giftStatus === 'minted') {
            console.log('Заминтил');
            return true
        } else await timeout(10000)
    }

    console.log('Waiting for mint stopped, timeout of 10 minutes exceeded');
}