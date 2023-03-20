import axios from 'axios';
import { timeout } from './index.js';

export async function checkEligibility(address) {
    let res = await axios.get(`https://atlantic-2.sunken-treasure.seinetwork.io/eligibility?address=${address}`).catch(error => console.log(error));

    if (res?.data) {
        return res.data.data
    }
}

async function checkGiftStatus(address) {
    let res = await axios.get(`https://atlantic-2.sunken-treasure.seinetwork.io/gift?recipientAddress=${address}`).catch(error => console.log(error));

    if (res?.data) {
        console.log(res.data.data);
        return res.data.data
    }
}

export async function waitForEligibility(address, txCount) {
    console.log('Waiting for eligibility...');
    await timeout(60000)

    for (let i = 0; i < 50; i++) {
        let data = await checkEligibility(address)

        if (data?.transactions > txCount * 0.6) { // percent of "missed" txs
            console.log(`Tx count: ${data?.transactions}, gifts to send: ${data?.numGifts}`);
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
    }).catch(error => console.log(error));

    if (res?.data) {
        console.log(`Sending gift to ${recipientAddress} - ${res?.data?.status}`);
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
    }).catch(error => console.log(error));

    if (res?.data) {
        console.log('Minting gift -', res?.data?.status);
        res?.data?.status != 'success' && console.log(res.data);
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