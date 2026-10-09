import { chromium } from 'playwright';
import path from 'path';

const artifactsDir = '/Users/rajgupta/.gemini/antigravity/brain/ba0a93e0-3491-47e0-9ac4-58ed1a3300f1';

async function verifyMoodMode() {
  console.log('=== VERIFYING DUAL MOOD MODE ARCHITECTURE ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Step 1: Initial visit with fresh storage -> MUST default to Cool mode
  await page.goto('http://127.0.0.1:4319');
  await page.evaluate(() => localStorage.removeItem('aira_mood_mode'));
  await page.reload();
  await page.waitForSelector('#mode');

  const initialMood = await page.evaluate(() => document.documentElement.dataset.mood || document.body.dataset.mood);
  console.log(`[TEST 1.1] Initial default mood: "${initialMood}" (Expected: "cool")`);
  if (initialMood !== 'cool') throw new Error(`Expected initial mood to be "cool", got "${initialMood}"`);

  const coolDisabled1 = await page.locator('#theme-style-cool').evaluate(el => el.disabled);
  const calmDisabled1 = await page.locator('#theme-style-calm').evaluate(el => el.disabled);
  console.log(`[TEST 1.2] Stylesheets initial: cool.disabled=${coolDisabled1}, calm.disabled=${calmDisabled1}`);
  if (coolDisabled1 !== false || calmDisabled1 !== true) {
    throw new Error(`Expected cool enabled (false) and calm disabled (true)`);
  }

  const btnCoolActive1 = await page.locator('#btn-mood-cool').evaluate(el => el.classList.contains('active'));
  const btnCalmActive1 = await page.locator('#btn-mood-calm').evaluate(el => el.classList.contains('active'));
  console.log(`[TEST 1.3] Toggle buttons initial: coolActive=${btnCoolActive1}, calmActive=${btnCalmActive1}`);
  if (!btnCoolActive1 || btnCalmActive1) throw new Error('Toggle button active state incorrect for Cool mode');

  const coolFont = await page.locator('body').evaluate(el => window.getComputedStyle(el).fontFamily);
  console.log(`[TEST 1.4] Body font-family in Cool mode: "${coolFont}"`);

  // Capture Cool Mode Screenshot
  const shotCool = path.join(artifactsDir, 'mood-mode-01-cool-default.png');
  await page.screenshot({ path: shotCool, fullPage: false });
  console.log(`Saved screenshot: ${shotCool}`);

  // Step 2: Switch to Calm Mode
  console.log('[TEST 2.1] Switching to Calm Mode via toggle...');
  await page.locator('#btn-mood-calm').click();
  await page.waitForTimeout(300);

  const calmMood = await page.evaluate(() => document.documentElement.dataset.mood || document.body.dataset.mood);
  console.log(`[TEST 2.2] Mood after toggle: "${calmMood}" (Expected: "calm")`);
  if (calmMood !== 'calm') throw new Error(`Expected mood to be "calm", got "${calmMood}"`);

  const coolDisabled2 = await page.locator('#theme-style-cool').evaluate(el => el.disabled);
  const calmDisabled2 = await page.locator('#theme-style-calm').evaluate(el => el.disabled);
  console.log(`[TEST 2.3] Stylesheets after calm toggle: cool.disabled=${coolDisabled2}, calm.disabled=${calmDisabled2}`);
  if (coolDisabled2 !== true || calmDisabled2 !== false) {
    throw new Error('Expected cool disabled (true) and calm enabled (false)');
  }

  const btnCoolActive2 = await page.locator('#btn-mood-cool').evaluate(el => el.classList.contains('active'));
  const btnCalmActive2 = await page.locator('#btn-mood-calm').evaluate(el => el.classList.contains('active'));
  console.log(`[TEST 2.4] Toggle buttons: coolActive=${btnCoolActive2}, calmActive=${btnCalmActive2}`);
  if (btnCoolActive2 || !btnCalmActive2) throw new Error('Toggle button active state incorrect for Calm mode');

  const storedMood1 = await page.evaluate(() => localStorage.getItem('aira_mood_mode'));
  console.log(`[TEST 2.5] Persisted localStorage value: "${storedMood1}" (Expected: "calm")`);
  if (storedMood1 !== 'calm') throw new Error(`Expected stored mood to be "calm", got "${storedMood1}"`);

  // Capture Calm Mode Screenshot
  const shotCalm = path.join(artifactsDir, 'mood-mode-02-calm-active.png');
  await page.screenshot({ path: shotCalm, fullPage: false });
  console.log(`Saved screenshot: ${shotCalm}`);

  // Step 3: Reload page -> Calm Mode MUST persist automatically!
  console.log('[TEST 3.1] Reloading page to verify persistence...');
  await page.reload();
  await page.waitForSelector('#mode');

  const reloadedMood = await page.evaluate(() => document.documentElement.dataset.mood || document.body.dataset.mood);
  console.log(`[TEST 3.2] Mood after page reload: "${reloadedMood}" (Expected: "calm")`);
  if (reloadedMood !== 'calm') throw new Error(`Expected reloaded mood to stay "calm", got "${reloadedMood}"`);

  const coolDisabled3 = await page.locator('#theme-style-cool').evaluate(el => el.disabled);
  const calmDisabled3 = await page.locator('#theme-style-calm').evaluate(el => el.disabled);
  console.log(`[TEST 3.3] Stylesheets after reload: cool.disabled=${coolDisabled3}, calm.disabled=${calmDisabled3}`);
  if (coolDisabled3 !== true || calmDisabled3 !== false) {
    throw new Error('Persistence failed: stylesheets not properly restored after reload');
  }

  // Step 4: Switch back to Cool Mode
  console.log('[TEST 4.1] Switching back to Cool Mode...');
  await page.locator('#btn-mood-cool').click();
  await page.waitForTimeout(300);

  const storedMood2 = await page.evaluate(() => localStorage.getItem('aira_mood_mode'));
  console.log(`[TEST 4.2] Persisted localStorage value: "${storedMood2}" (Expected: "cool")`);
  if (storedMood2 !== 'cool') throw new Error(`Expected stored mood to be "cool", got "${storedMood2}"`);

  // Step 5: Start a workout session in Cool mode and switch mid-session
  console.log('[TEST 5.1] Launching workout session to test interactive state retention across mood toggle...');
  await page.locator('#intent-hiit').click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Tabata")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Tabata' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Kettlebell")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Kettlebell' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Redline")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Redline' }).click();
  await page.waitForSelector('#split-tracker .split-tracker-item', { timeout: 10000 });

  // Advance to Variation 1
  await page.locator('#next').click();
  await page.waitForSelector('.set-pill', { timeout: 10000 });
  const pos1 = await page.locator('#position').innerText();
  console.log(`[TEST 5.2] At workout position "${pos1}" in Cool mode. Now switching to Calm mode mid-workout...`);

  // Capture Cool Mode during active workout
  const shotCoolWorkout = path.join(artifactsDir, 'mood-mode-03-cool-workout.png');
  await page.screenshot({ path: shotCoolWorkout, fullPage: false });

  // Toggle to Calm mode mid-workout
  await page.locator('#btn-mood-calm').click();
  await page.waitForTimeout(300);

  const pos2 = await page.locator('#position').innerText();
  console.log(`[TEST 5.3] At workout position "${pos2}" in Calm mode after toggle.`);
  if (pos1 !== pos2) throw new Error(`Workout position corrupted during mood toggle: "${pos1}" vs "${pos2}"`);

  // Complete Set 1 in Calm mode to verify workout continues seamlessly
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 1' }).click();
  await page.waitForTimeout(200);

  // Capture Calm Mode during active workout
  const shotCalmWorkout = path.join(artifactsDir, 'mood-mode-04-calm-workout.png');
  await page.screenshot({ path: shotCalmWorkout, fullPage: false });

  await browser.close();
  console.log('=== ALL MOOD MODE TESTS PASSED 100% SUCCESSFULLY! ===');
}

verifyMoodMode().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
