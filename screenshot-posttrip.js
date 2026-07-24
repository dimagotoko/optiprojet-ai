const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Mobile
  const mobileCtx = await browser.newContext({
    viewport: { width: 420, height: 900 },
  });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto("http://localhost:9003/post-trip", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await mobilePage.waitForTimeout(3500);
  await mobilePage.screenshot({
    path: "C:\\tmp\\posttrip-mobile.png",
    fullPage: true,
  });
  await mobileCtx.close();

  // Desktop
  const desktopCtx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto("http://localhost:9003/post-trip", {
    waitUntil: "domcontentloaded",
    timeout: 20000,
  });
  await desktopPage.waitForTimeout(3500);
  await desktopPage.screenshot({
    path: "C:\\tmp\\posttrip-desktop.png",
    fullPage: true,
  });
  await desktopCtx.close();

  await browser.close();
  console.log("done");
})();
