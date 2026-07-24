const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:9003/trips", { waitUntil: "networkidle", timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  await page.evaluate(function() { window.scrollTo(0, document.body.scrollHeight); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "C:\\tmp\\footer-mobile.png", fullPage: false });
  await browser.close();
})();
