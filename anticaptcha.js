import { config } from "./config.js";
import axios from "axios";
import { timeout } from "./index.js";


export async function solveCaptcha() {
    console.log('Starting to solve captcha');

    let res = await axios(`https://api.anti-captcha.com/createTask`, {
        method: "POST",
        data: {
            "clientKey": config.anticaptchaApikey,
            "task": {
                "type": "HCaptchaTaskProxyless",
                "websiteURL": 'https://app.seinetwork.io',
                "websiteKey": "73ec4927-b43f-40b1-b61a-646a5ec58a45",
                "isInvisible": false
            },
            "softId": 0
        }
    })

    await timeout(10000)
    let solution = await getCaptchaResponse(res.data.taskId)

    return solution
}

async function getCaptchaResponse(taskid) {
    let solution = '';

    while (!solution) {
        let res = await axios(`https://api.anti-captcha.com/getTaskResult`, {
            method: 'POST',
            data: {
                "clientKey": config.anticaptchaApikey,
                "taskId": taskid
            }
        })

        if (res?.data.status == "ready") {
            console.log(`Captcha status: ${res?.data?.status}`);
            return res.data.solution.gRecaptchaResponse
        } else if (res?.data?.status == "processing") {
            console.log(`Captcha status: ${res?.data?.status}`);
            await timeout(5000)
        } else {
            console.log(res?.data?.errorDescription);
            return false
        }
    }
}