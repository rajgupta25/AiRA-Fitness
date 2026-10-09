import { chromium } from 'playwright';
import path from 'path';

const artifactsDir = '/Users/rajgupta/.gemini/antigravity/brain/ba0a93e0-3491-47e0-9ac4-58ed1a3300f1';

async function verifyRebrandAndOnboarding() {
  console.log('=== VERIFYING REBRAND TO AIRA FITNESS, NEW LOGO, AND ONBOARDING GUIDE ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('.brand-title');

  // 1. Check title and brand
  const title = await page.title();
  console.log(`Page title: "${title}"`);
  const brandTitle = await page.locator('.brand-title').innerText();
  console.log(`Brand title: "${brandTitle}"`);

  // 2. Check logo img
  const logoVisible = await page.locator('.brand-logo-img').isVisible();
  console.log(`Brand logo image visible: ${logoVisible}`);

  // 3. Check sidebar header
  const sidebarHeader = await page.locator('.sidebar-section-header').first().innerText();
  console.log(`Sidebar header: "${sidebarHeader}"`);

  // 4. Check Coach LIVE Training pill
  const audioPill = await page.locator('.audio-notice-pill').innerText();
  console.log(`Audio notice pill: "${audioPill}"`);

  // 5. Check Empty Active Workout Stage (Onboarding Guide)
  const guideEyebrow = await page.locator('.guide-header .eyebrow').innerText();
  console.log(`Guide eyebrow: "${guideEyebrow}"`);
  const stepCount = await page.locator('.guide-step-card').count();
  console.log(`Step cards count: ${stepCount}`);
  const proTipsVisible = await page.locator('.guide-pro-tips').isVisible();
  console.log(`Pro tips visible: ${proTipsVisible}`);

  // 6. Check Chat Welcome Card
  const chatWelcomeTitle = await page.locator('.chat-welcome-title').innerText();
  console.log(`Chat welcome title: "${chatWelcomeTitle}"`);
  const capCount = await page.locator('.chat-cap-item').count();
  console.log(`Chat capability items count: ${capCount}`);

  // Capture Cool Mode Onboarding Screenshot
  const shotCoolEmpty = path.join(artifactsDir, 'aira-fitness-01-cool-onboarding.png');
  await page.screenshot({ path: shotCoolEmpty, fullPage: false });
  console.log(`Saved screenshot: ${shotCoolEmpty}`);

  // Switch to Calm Mode and Capture
  await page.locator('#btn-mood-calm').click();
  await page.waitForTimeout(400);

  const shotCalmEmpty = path.join(artifactsDir, 'aira-fitness-02-calm-onboarding.png');
  await page.screenshot({ path: shotCalmEmpty, fullPage: false });
  console.log(`Saved screenshot: ${shotCalmEmpty}`);

  // Switch back to Cool, trigger Workout style and test Active Workout Stage
  await page.locator('#btn-mood-cool').click();
  await page.waitForTimeout(300);
  await page.locator('#intent-hiit').click();
  await page.waitForTimeout(500);

  const shotCoolActive = path.join(artifactsDir, 'aira-fitness-03-cool-active-workout.png');
  await page.screenshot({ path: shotCoolActive, fullPage: false });
  console.log(`Saved screenshot: ${shotCoolActive}`);

  // Switch to Calm in active workout
  await page.locator('#btn-mood-calm').click();
  await page.waitForTimeout(400);

  const shotCalmActive = path.join(artifactsDir, 'aira-fitness-04-calm-active-workout.png');
  await page.screenshot({ path: shotCalmActive, fullPage: false });
  console.log(`Saved screenshot: ${shotCalmActive}`);

  await browser.close();
  console.log('=== VERIFICATION COMPLETED SUCCESSFULLY ===');
}

verifyRebrandAndOnboarding().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
