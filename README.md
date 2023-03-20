# sei-treasure

This script allows you to mint SEI treasure gifts

## Algoritm
1) Generating account
2) Requesting Sei from faucet (solving captcha)
3) Sending tons of txs
4) Sending gifts to our wallets
5) Minting gifts

## Requeremets
<b>To run this bot you have to top up your balance on [anticaptcha service](http://getcaptchasolution.com/hdvqxebxxf)</b>

Mnemonics from generated accounts will be saved to folder `mnemonics`

## Setup bot
1) Download ZIP and extract it to a folder
2) Install node.js: `https://nodejs.org/en/` (LTS)
3) Paste your `APIKEY` from anticaptcha service in `config.js`
4) Open folder with the bot in `cmd`
```bash
cd <path to folder with script>
```
5) Install dependencies
```bash
npm install
```
6) Start
```bash
node index
```
