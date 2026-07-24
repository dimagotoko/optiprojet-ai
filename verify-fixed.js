const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:9003/trip-details/pHe6sDksEoXGYABvc5NR", { waitUntil: "networkidle", timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "C:\\tmp\\trip-details-FIXED.png", fullPage: true });

  // Check if nav overflow is pre-existing (also on /trips which we didn't touch)
  var navInfo = await page.evaluate(function() {
    var nav = document.querySelector("nav.flex.items-center.gap-6");
    if (!nav) return null;
    var cs = window.getComputedStyle(nav);
    return {
      display: cs.display,
      right: Math.round(nav.getBoundingClientRect().right),
      width: Math.round(nav.getBoundingClientRect().width),
      visibility: cs.visibility,
      parent: (nav.parentElement || {}).className ? nav.parentElement.className.slice(0, 80) : "?"
    };
  });
  console.log("NAV info:", JSON.stringify(navInfo));

  // Check the trip-details specific elements are now correctly sized
  var addressInfo = await page.evaluate(function() {
    var links = Array.from(document.querySelectorAll("a.flex.min-w-0.overflow-hidden"));
    return links.map(function(a) {
      return {
        width: Math.round(a.getBoundingClientRect().width),
        right: Math.round(a.getBoundingClientRect().right),
        overflow: window.getComputedStyle(a).overflow
      };
    });
  });
  console.log("Address links:", JSON.stringify(addressInfo));

  await browser.close();
})();
