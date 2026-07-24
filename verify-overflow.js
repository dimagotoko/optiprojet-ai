const { chromium } = require("playwright");

const BASE = "http://localhost:9003";
const MOBILE = { width: 390, height: 844 };

function checkOverflow(page) {
  return page.evaluate(() => {
    const sw = document.documentElement.scrollWidth;
    const cw = document.documentElement.clientWidth;
    const overflowers = [];
    document.querySelectorAll("*").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > document.documentElement.clientWidth + 2) {
        overflowers.push({
          tag: el.tagName,
          class: el.className?.toString?.()?.slice(0, 100) ?? "",
          right: Math.round(rect.right),
          cw: document.documentElement.clientWidth,
        });
      }
    });
    return {
      scrollWidth: sw,
      clientWidth: cw,
      overflows: sw > cw,
      overflowers: overflowers.slice(0, 6),
    };
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: MOBILE });
  const page = await ctx.newPage();

  // ── 1. /trips ──
  await page
    .goto(`${BASE}/trips`, { waitUntil: "networkidle", timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  const tripsResult = await checkOverflow(page);
  await page.screenshot({ path: "C:\\tmp\\trips-390.png", fullPage: false });

  let tripUrl = null;
  const tripLinks = await page.$$('a[href^="/trip-details/"]');
  if (tripLinks.length > 0) {
    tripUrl = await tripLinks[0].getAttribute("href");
  }

  // ── 2. /trip-details/[id] ──
  let detailsResult = null;
  if (tripUrl) {
    await page
      .goto(`${BASE}${tripUrl}`, {
        waitUntil: "networkidle",
        timeout: 20000,
      })
      .catch(() => {});
    await page.waitForTimeout(2000);
    detailsResult = await checkOverflow(page);
    await page.screenshot({
      path: "C:\\tmp\\trip-details-390.png",
      fullPage: true,
    });
  }

  // ── 3. /dashboard ──
  await page
    .goto(`${BASE}/dashboard`, { waitUntil: "networkidle", timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  const dashResult = await checkOverflow(page);
  await page.screenshot({
    path: "C:\\tmp\\dashboard-390.png",
    fullPage: false,
  });

  await browser.close();

  console.log("=== RÉSULTATS OVERFLOW 390px ===");
  console.log("\n/trips:");
  console.log(
    "  scrollWidth:",
    tripsResult.scrollWidth,
    "| clientWidth:",
    tripsResult.clientWidth,
    "| OVERFLOW:",
    tripsResult.overflows,
  );
  if (tripsResult.overflows)
    console.log(
      "  coupables:",
      JSON.stringify(tripsResult.overflowers, null, 2),
    );

  if (detailsResult) {
    console.log(`\n/trip-details${tripUrl}:`);
    console.log(
      "  scrollWidth:",
      detailsResult.scrollWidth,
      "| clientWidth:",
      detailsResult.clientWidth,
      "| OVERFLOW:",
      detailsResult.overflows,
    );
    if (detailsResult.overflows)
      console.log(
        "  coupables:",
        JSON.stringify(detailsResult.overflowers, null, 2),
      );
  } else {
    console.log(
      "\n/trip-details: IMPOSSIBLE — aucun lien trouvé sur /trips (page protégée ?)",
    );
  }

  console.log("\n/dashboard:");
  console.log(
    "  scrollWidth:",
    dashResult.scrollWidth,
    "| clientWidth:",
    dashResult.clientWidth,
    "| OVERFLOW:",
    dashResult.overflows,
  );
  if (dashResult.overflows)
    console.log(
      "  coupables:",
      JSON.stringify(dashResult.overflowers, null, 2),
    );
})();
