const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:9003/trip-details/pHe6sDksEoXGYABvc5NR", { waitUntil: "networkidle", timeout: 20000 }).catch(()=>{});
  await page.waitForTimeout(2500);

  const info = await page.evaluate(function() {
    // Check if our fix (min-w-0) is in the rendered spans
    var spans = Array.from(document.querySelectorAll("span.truncate"));
    var spanInfo = spans.map(function(s) {
      var cs = window.getComputedStyle(s);
      return {
        text: s.textContent.slice(0, 60),
        classList: s.className,
        computedMinWidth: cs.minWidth,
        computedOverflow: cs.overflow,
        computedWhiteSpace: cs.whiteSpace,
        width: Math.round(s.getBoundingClientRect().width),
        right: Math.round(s.getBoundingClientRect().right)
      };
    });

    // Check address <a> tags
    var aLinks = Array.from(document.querySelectorAll("a.flex.items-center"));
    var aInfo = aLinks.slice(0,4).map(function(a) {
      var cs = window.getComputedStyle(a);
      return {
        text: a.textContent.slice(0, 50),
        classList: a.className.slice(0, 100),
        computedMinWidth: cs.minWidth,
        computedOverflow: cs.overflow,
        width: Math.round(a.getBoundingClientRect().width),
        right: Math.round(a.getBoundingClientRect().right)
      };
    });

    // Check h1
    var h1 = document.querySelector("h1");
    var h1cs = h1 ? window.getComputedStyle(h1) : null;

    return {
      spans: spanInfo,
      aLinks: aInfo,
      h1: h1 ? {
        text: h1.textContent.slice(0, 80),
        width: Math.round(h1.getBoundingClientRect().width),
        right: Math.round(h1.getBoundingClientRect().right),
        whiteSpace: h1cs.whiteSpace,
        position: h1cs.position
      } : null
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
