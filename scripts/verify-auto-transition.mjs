import { chromium } from 'playwright';
import path from 'path';

const artifactsDir = '/Users/rajgupta/.gemini/antigravity/brain/ba0a93e0-3491-47e0-9ac4-58ed1a3300f1';

async function verifyAutoTransition() {
  console.log('=== VERIFYING AUTOMATED TRANSITION & RECOVERY AUTO-ADVANCE ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('#mode');

  // Start HIIT Workout
  await page.locator('#intent-hiit').click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Tabata")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Tabata' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Kettlebell")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Kettlebell' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Redline")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Redline' }).click();
  await page.waitForSelector('#split-tracker .split-tracker-item', { timeout: 10000 });

  // Advance to Variation 1 (Dumbbell Goblet Squats)
  await page.locator('#next').click();
  await page.waitForSelector('.set-pill', { timeout: 10000 });

  const posVar1 = await page.locator('#position').innerText();
  console.log(`[TEST 1] On Variation 1 at position: "${posVar1.trim()}"`);

  // Complete Sets 1, 2, and 3
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 1' }).click();
  await page.waitForTimeout(200);
  await page.locator('.set-hud-panel button', { hasText: 'Skip Break' }).click({ force: true });
  await page.waitForTimeout(200);
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 2' }).click();
  await page.waitForTimeout(200);
  await page.locator('.set-hud-panel button', { hasText: 'Skip Break' }).click({ force: true });
  await page.waitForTimeout(200);

  // Complete Final Set 3
  console.log('[TEST 2] Completing Final Set 3 on Variation 1...');
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 3' }).click();

  // Wait for auto-advance to Inter-Variation Recovery screen (Position 3 / 11)
  await page.waitForSelector('.timer[aria-label="Transition Rest"]', { timeout: 8000 });
  const posRest1 = await page.locator('#position').innerText();
  console.log(`[TEST 3] Landed on Inter-Variation Recovery screen at position: "${posRest1.trim()}"`);
  if (!posRest1.includes('3 / 11')) {
    throw new Error(`FAIL: Expected position 3 / 11, got "${posRest1}"`);
  }

  // Verify timer AUTO-STARTED without user clicking "Start simulation"
  await page.waitForTimeout(500);
  const timerStatus = await page.locator('.timer-status').innerText();
  console.log(`[TEST 4] Transition Timer Status: "${timerStatus.trim()}" (Expected: "running")`);
  if (timerStatus.trim().toLowerCase() !== 'running') {
    throw new Error(`FAIL: Timer did not auto-start! Status: "${timerStatus}"`);
  }

  // Verify presence of "Skip Rest & Start Next Variation" button
  const skipBtn = page.locator('.btn-skip-rest');
  const hasSkipBtn = (await skipBtn.count()) === 1;
  console.log(`[TEST 5] "Skip Rest & Start Next Variation" button present: ${hasSkipBtn}`);
  if (!hasSkipBtn) {
    throw new Error('FAIL: Skip Rest button missing on transition screen');
  }

  // Verify Auto-advance Notice is visible
  const autoNoticeText = await page.locator('.timer-auto-notice').innerText();
  console.log(`[TEST 6] Auto-notice text: "${autoNoticeText.trim()}"`);
  if (!autoNoticeText.includes('Auto-advancing')) {
    throw new Error(`FAIL: Auto-notice missing expected text: "${autoNoticeText}"`);
  }

  // Capture screenshot of auto-running transition rest phase
  await page.screenshot({ path: path.join(artifactsDir, 'auto-transition-01-running.png'), fullPage: true });

  // Now trigger finish/skip rest and verify AUTOMATIC advance to Variation 2 (NO manual #next click!)
  console.log('[TEST 7] Clicking "Skip Rest & Start Next Variation" to test auto-advance...');
  await skipBtn.click();

  // Wait for automatic progression to Variation 2 (Screen 4 / 11: Explosive Push-Up to Mountain Climber)
  await page.waitForSelector('h3:has-text("Explosive Push-Up to Mountain Climber")', { timeout: 8000 });
  const posVar2 = await page.locator('#position').innerText();
  console.log(`[TEST 8] Automatically landed on Variation 2 at position: "${posVar2.trim()}"`);
  if (!posVar2.includes('4 / 11')) {
    throw new Error(`FAIL: Did not auto-advance to position 4 / 11, got "${posVar2}"`);
  }

  // Capture screenshot of auto-landed Variation 2
  await page.screenshot({ path: path.join(artifactsDir, 'auto-transition-02-next-variation.png'), fullPage: true });

  console.log('=== ALL AUTOMATED TRANSITION & RECOVERY REQUIREMENTS VERIFIED 100% PASS! ===');
  await browser.close();
}

verifyAutoTransition().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
