const { chromium } = require("playwright");

const BASE = "http://localhost:9003";
const MOBILE = { width: 390, height: 844 };

async function checkOverflow(page) {
  return page.evaluate(function() {
    var sw = document.documentElement.scrollWidth;
    var cw = document.documentElement.clientWidth;
    var overflowers = [];
    document.querySelectorAll("*").forEach(function(el) {
      var rect = el.getBoundingClientRect();
      if (rect.right > cw + 2) {
        overflowers.push({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 100),
          right: Math.round(rect.right),
          cw: cw
        });
      }
    });
    return { sw: sw, cw: cw, overflow: sw > cw, overflowers: overflowers.slice(0, 5) };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: MOBILE });
  const page = await ctx.newPage();

  var pages = [
    { name: "/trips", url: BASE + "/trips" },
    { name: "/trip-details/pHe6sDksEoXGYABvc5NR", url: BASE + "/trip-details/pHe6sDksEoXGYABvc5NR" },
    { name: "/trip-details/2icsciColQ8OSynKVAeT", url: BASE + "/trip-details/2icsciColQ8OSynKVAeT" },
    { name: "/dashboard", url: BASE + "/dashboard" }
  ];

  for (var i = 0; i < pages.length; i++) {
    var p = pages[i];
    await page.goto(p.url, { waitUntil: "networkidle", timeout: 20000 }).catch(function(){});
    await page.waitForTimeout(2000);
    var result = await checkOverflow(page);
    var fname = p.name.replace(/\//g, "_").replace(/[^a-zA-Z0-9_]/g, "") + ".png";
    await page.screenshot({ path: "C:\\tmp\\" + fname + ".png", fullPage: true });
    console.log(p.name + " => overflow:" + result.overflow + " scrollW:" + result.sw + " clientW:" + result.cw);
    if (result.overflow) {
      result.overflowers.forEach(function(o) {
        console.log("  COUPABLE: <" + o.tag + "> right=" + o.right + " cls=" + o.cls);
      });
    }
  }

  await browser.close();
})();
