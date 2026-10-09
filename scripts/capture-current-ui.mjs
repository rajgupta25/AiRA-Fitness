import { chromium } from 'playwright';
import { join } from 'node:path';

const artifactDir = '/Users/rajgupta/.gemini/antigravity/brain/ba0a93e0-3491-47e0-9ac4-58ed1a3300f1';

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Initial State
  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('#mode');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(artifactDir, 'current-ui-01-initial.png') });
  console.log('Saved current-ui-01-initial.png');

  // 2. Click Compound Strength (Intake state)
  await page.locator('#intent-strength').click();
  await page.waitForSelector('.chat-mcq-chip', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(artifactDir, 'current-ui-02-intake.png') });
  console.log('Saved current-ui-02-intake.png');

  // Answer Q1, Q2, Q3
  await page.locator('.chat-mcq-chip', { hasText: 'Push Focus' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Hypertrophy Volume")', { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.locator('.chat-mcq-chip', { hasText: 'Hypertrophy Volume' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("100% Unrestricted")', { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.locator('.chat-mcq-chip', { hasText: '100% Unrestricted' }).click();
  await page.waitForSelector('#split-tracker .split-tracker-item', { timeout: 10000 });
  await page.waitForTimeout(500);

  // 3. Workout Loaded (Intro / Split Variations view)
  await page.screenshot({ path: join(artifactDir, 'current-ui-03-workout-intro.png') });
  console.log('Saved current-ui-03-workout-intro.png');

  // 4. Advance to Variation 1 (ExerciseCard with Set Tracker HUD)
  await page.locator('#next').click();
  await page.waitForSelector('.set-pill', { timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(artifactDir, 'current-ui-04-exercise-ready.png') });
  console.log('Saved current-ui-04-exercise-ready.png');

  // 5. Start Set 1 (Working phase)
  await page.locator('.set-hud-panel button', { hasText: 'Start Set 1' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(artifactDir, 'current-ui-05-exercise-working.png') });
  console.log('Saved current-ui-05-exercise-working.png');

  // 6. Complete Set 1 (Resting phase with Box Breathing)
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 1' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(artifactDir, 'current-ui-06-exercise-resting.png') });
  console.log('Saved current-ui-06-exercise-resting.png');

  await browser.close();
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
