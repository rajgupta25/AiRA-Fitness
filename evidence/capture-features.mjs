import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('#mode');
  await page.waitForTimeout(400);

  // 1. Studio Overview
  await page.screenshot({ path: 'evidence/screenshots/feature-studio-overview.png', fullPage: true });

  // 2. Chat Intake Assessment: Start HIIT Intake
  await page.click('#intent-hiit');
  await page.waitForSelector('#pending', { state: 'hidden' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'evidence/screenshots/feature-chat-intake-q1.png', fullPage: true });

  // Answer Q1 with chip [A] (Explosive Power)
  const q1Chip = page.locator('.message.assistant').last().locator('.chat-mcq-chip').first();
  await q1Chip.click();
  await page.waitForSelector('#pending', { state: 'hidden' });
  await page.waitForTimeout(400);

  // Answer Q2 with chip [A] (Chest & Shoulders Push Focus)
  const q2Chip = page.locator('.message.assistant').last().locator('.chat-mcq-chip').first();
  await q2Chip.click();
  await page.waitForSelector('#pending', { state: 'hidden' });
  await page.waitForTimeout(400);

  // Answer Q3 with chip [B] (Sensitive Knees -> Low-Impact Regression)
  const q3Chip = page.locator('.message.assistant').last().locator('.chat-mcq-chip').nth(1);
  await q3Chip.click();
  await page.waitForSelector('#pending', { state: 'hidden' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'evidence/screenshots/feature-chat-calibrated.png', fullPage: true });

  // 3. Active Workout Stage - Advance to Drill 1 (Bodyweight Box Squat regression for sensitive knees)
  await page.waitForSelector('#navigation:not([hidden])');
  await page.click('#next');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'evidence/screenshots/feature-active-workout.png', fullPage: true });

  // Advance to Rest Interval 1 (Box Breathing visual pacer)
  await page.click('#next');
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'evidence/screenshots/feature-rest-breathing.png', fullPage: true });

  // Open Athlete Profile & Health Diagnostics Modal
  await page.click('#btn-athlete-profile');
  await page.waitForSelector('#profile-modal[open]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'evidence/screenshots/feature-profile-modal.png', fullPage: true });
  await page.click('#btn-close-profile');
  await page.waitForTimeout(400);

  await browser.close();
  console.log('All feature screenshots captured successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
