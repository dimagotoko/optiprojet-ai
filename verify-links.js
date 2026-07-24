const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:9003/trips", { waitUntil: "networkidle", timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  const allLinks = await page.$$eval("a", function(els) {
    return els.map(function(e) { return e.getAttribute("href"); }).filter(Boolean);
  });
  console.log("all links:", JSON.stringify(allLinks));
  await browser.close();
})();
