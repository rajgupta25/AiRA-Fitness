import { chromium } from 'playwright';
import { join } from 'node:path';

const artifactDir = '/Users/rajgupta/.gemini/antigravity/brain/ba0a93e0-3491-47e0-9ac4-58ed1a3300f1';

async function captureFinish() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('#mode');

  // Start Compound Strength
  await page.locator('#intent-strength').click();
  await page.waitForSelector('.chat-mcq-chip', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Push Focus' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Hypertrophy Volume")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Hypertrophy Volume' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("100% Unrestricted")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: '100% Unrestricted' }).click();
  await page.waitForSelector('#split-tracker .split-tracker-item', { timeout: 10000 });

  // Navigate to screen 11 (Summary screen)
  for (let i = 0; i < 10; i++) {
    await page.locator('#next').click();
    await page.waitForTimeout(150);
  }

  await page.waitForTimeout(500);
  await page.screenshot({ path: join(artifactDir, 'current-ui-07-finish-screen-ready.png') });
  console.log('Saved current-ui-07-finish-screen-ready.png');

  // Click Finish Workout
  await page.locator('#next').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(artifactDir, 'current-ui-08-workout-logged.png') });
  console.log('Saved current-ui-08-workout-logged.png');

  await browser.close();
}

captureFinish().catch(err => {
  console.error(err);
  process.exit(1);
});
