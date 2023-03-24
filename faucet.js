import axios from "axios";
import { solveCaptcha } from "./anticaptcha.js";


export async function getTokensFromFaucet(address) {
    let captchaSolution = await solveCaptcha();

    if (captchaSolution) {
        let res = await axios(`https://faucet-v2.seinetwork.io/atlantic-2`, {
            method: "POST",
            data: {
                address: address,
                captchaKey: captchaSolution
            }
        }).catch(err => console.log(err?.response?.data))

        if (res?.data) {
            console.log(`Faucet status: ${res?.data?.status}`);
            return true
        }
    }

    return false
}