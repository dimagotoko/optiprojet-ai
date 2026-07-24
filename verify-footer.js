const { chromium } = require("playwright");

async function checkOverflow(page) {
  return page.evaluate(function() {
    var sw = document.documentElement.scrollWidth;
    var cw = document.documentElement.clientWidth;
    var overflowers = [];
    document.querySelectorAll("*").forEach(function(el) {
      var rect = el.getBoundingClientRect();
      if (rect.right > cw + 1) {
        overflowers.push({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 90),
          right: Math.round(rect.right)
        });
      }
    });
    return { sw: sw, cw: cw, overflow: sw > cw, overflowers: overflowers.slice(0, 4) };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── MOBILE 390px ──
  var mob = await browser.newContext({ viewport: { width: 390, height: 844 } });
  var page = await mob.newPage();
  var pages = [
    "/trips",
    "/trip-details/pHe6sDksEoXGYABvc5NR",
    "/trip-details/2icsciColQ8OSynKVAeT",
    "/dashboard"
  ];
  console.log("=== MOBILE 390px ===");
  for (var i = 0; i < pages.length; i++) {
    await page.goto("http://localhost:9003" + pages[i], { waitUntil: "networkidle", timeout: 20000 }).catch(function(){});
    await page.waitForTimeout(2000);
    // scroll to bottom to trigger footer render
    await page.evaluate(function() { window.scrollTo(0, document.body.scrollHeight); });
    await page.waitForTimeout(500);
    var r = await checkOverflow(page);
    console.log(pages[i] + " => overflow:" + r.overflow + " scrollW:" + r.sw + " clientW:" + r.cw);
    if (r.overflow) r.overflowers.forEach(function(o) { console.log("  COUPABLE: <" + o.tag + "> right=" + o.right + " cls=" + o.cls); });
  }
  await mob.close();

  // ── DESKTOP 1280px (footer doit rester sur 1 ligne) ──
  var desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  var dpage = await desk.newPage();
  await dpage.goto("http://localhost:9003/trips", { waitUntil: "networkidle", timeout: 20000 }).catch(function(){});
  await dpage.waitForTimeout(2000);
  await dpage.evaluate(function() { window.scrollTo(0, document.body.scrollHeight); });
  await dpage.waitForTimeout(500);
  var footerInfo = await dpage.evaluate(function() {
    var nav = document.querySelector("footer nav");
    if (!nav) return null;
    var links = Array.from(nav.querySelectorAll("a"));
    var firstTop = links[0] ? links[0].getBoundingClientRect().top : 0;
    var allSameLine = links.every(function(l) { return Math.abs(l.getBoundingClientRect().top - firstTop) < 4; });
    return {
      navWidth: Math.round(nav.getBoundingClientRect().width),
      linkCount: links.length,
      allSameLine: allSameLine,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    };
  });
  console.log("\n=== DESKTOP 1280px ===");
  console.log("footer nav:", JSON.stringify(footerInfo));

  await desk.close();
  await browser.close();
})();
