const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:9003/trips", { waitUntil: "networkidle", timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  const url = page.url();
  const title = await page.title();
  const links = await page.$$eval("a", function(els) {
    return els.map(function(e) { return e.getAttribute("href"); }).filter(function(h) { return h && h.indexOf("trip-details") >= 0; });
  });
  console.log("final url:", url);
  console.log("title:", title);
  console.log("trip-details links:", JSON.stringify(links));
  await browser.close();
})();
