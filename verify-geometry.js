const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:9003/trip-details/pHe6sDksEoXGYABvc5NR", { waitUntil: "networkidle", timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(2500);

  // Compute geometry of key containers
  const info = await page.evaluate(function() {
    function gi(sel) {
      var el = document.querySelector(sel);
      if (!el) return null;
      var r = el.getBoundingClientRect();
      var s = window.getComputedStyle(el);
      return { right: Math.round(r.right), width: Math.round(r.width), minWidth: s.minWidth, display: s.display, gridTemplateColumns: s.gridTemplateColumns };
    }
    return {
      container: gi(".container"),
      grid: gi(".grid"),
      colSpan2: gi(".md\\:col-span-2"),
      banner: gi(".rounded-xl.overflow-hidden"),
      h1: gi("h1"),
      metaViewport: (document.querySelector("meta[name=viewport]") || {}).content,
      bodyScrollW: document.body.scrollWidth,
      htmlScrollW: document.documentElement.scrollWidth,
      htmlClientW: document.documentElement.clientWidth,
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
