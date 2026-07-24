const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:9003/trips", { waitUntil: "networkidle", timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "C:\\tmp\\trips-390-content.png", fullPage: true });
  const bodyText = await page.$eval("body", function(el) { return el.innerText.slice(0, 500); });
  console.log("body text:", bodyText);
  await browser.close();
})();
