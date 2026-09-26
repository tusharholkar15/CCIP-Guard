const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://docs.chain.link/ccip/supported-networks/v1_2_0/mainnet');
  const text = await page.evaluate(() => document.body.innerText);
  console.log(text.substring(0, 1000));
  await browser.close();
}
run();
