import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const artifactsDir = '/Users/rajgupta/.gemini/antigravity/brain/ba0a93e0-3491-47e0-9ac4-58ed1a3300f1';

async function verifyEnhancements() {
  console.log('=== VERIFYING LATEST USER ENHANCEMENTS ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('#mode');

  // Requirement 1: Stat card label renamed from "Circuit Pace" to "Session Progress"
  const statLabel = await page.locator('.stat-card:nth-child(3) .stat-card-label').innerText();
  console.log(`[REQ 1] Stat card label: "${statLabel}" (Expected: "Session Progress")`);
  if (!statLabel.toUpperCase().includes('SESSION PROGRESS')) {
    throw new Error(`FAIL: Expected "SESSION PROGRESS", got "${statLabel}"`);
  }

  // Requirement 2: Training Split Log internal scroll height is lengthened (max-height 300px)
  const historyListMaxHeight = await page.locator('.calendar-history-list').evaluate(el => window.getComputedStyle(el).maxHeight);
  console.log(`[REQ 2] Calendar history list max-height: ${historyListMaxHeight} (Expected: 300px)`);
  if (historyListMaxHeight !== '300px') {
    throw new Error(`FAIL: Expected 300px max-height, got "${historyListMaxHeight}"`);
  }

  // Requirement 3: Chat custom text input returns intelligent Coach Aira response (no mock error!)
  const chatInput = page.locator('#message');
  await chatInput.fill('my knees feel tight, what should I do?');
  await page.locator('#composer').dispatchEvent('submit');
  await page.waitForTimeout(600);

  const lastAssistantMessage = await page.locator('.message.assistant').last().innerText();
  console.log(`[REQ 3.1] Coach Aira response to knee query:\n"${lastAssistantMessage.trim()}"`);
  if (lastAssistantMessage.includes('Mock only understands') || !lastAssistantMessage.includes('Coach Aira')) {
    throw new Error(`FAIL: Did not receive coach response or received mock error: "${lastAssistantMessage}"`);
  }

  // Test second query: form check
  await chatInput.fill('how is my squat form and tempo?');
  await page.locator('#composer').dispatchEvent('submit');
  await page.waitForTimeout(600);

  const formMsg = await page.locator('.message.assistant').last().innerText();
  console.log(`[REQ 3.2] Coach Aira response to form query:\n"${formMsg.trim()}"`);
  if (formMsg.includes('Mock only understands') || !formMsg.includes('Coach Aira')) {
    throw new Error(`FAIL: Form query failed: "${formMsg}"`);
  }

  // Start a workout to check variations, split tracker label font size, progress ring & voice cues
  await page.locator('#intent-hiit').click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Tabata")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Tabata' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Kettlebell")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Kettlebell' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Redline")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Redline' }).click();
  await page.waitForSelector('#split-tracker .split-tracker-item', { timeout: 10000 });

  // Advance into exercises
  await page.locator('#next').click();
  await page.waitForSelector('.set-pill', { timeout: 10000 });

  // Requirement 4: Split variations label font-size increased by 2px (to 12px)
  const labelFontSize = await page.locator('#split-tracker .split-tracker-item .split-tracker-label').first().evaluate(el => window.getComputedStyle(el).fontSize);
  console.log(`[REQ 4] Split tracker label font-size: ${labelFontSize} (Expected: 12px)`);
  if (labelFontSize !== '12px') {
    throw new Error(`FAIL: Expected 12px, got "${labelFontSize}"`);
  }

  // Requirement 5: Progress ring dynamic styling & percentage
  const ringPctVar = await page.locator('#circular-progress').evaluate(el => el.style.getPropertyValue('--progress-pct'));
  const ringPctText = await page.locator('#stat-pace-pct').innerText();
  console.log(`[REQ 5] Progress ring --progress-pct: "${ringPctVar}%", text: "${ringPctText}"`);
  if (!ringPctVar || ringPctVar === '0') {
    throw new Error(`FAIL: Progress ring --progress-pct not set properly: "${ringPctVar}"`);
  }

  // Requirement 6: Dynamic voice cues frequency
  const cue1 = await page.locator('#spoken').innerText();
  console.log(`[REQ 6.1] Initial cue: "${cue1.trim()}"`);
  // Wait 3 seconds - cue should stay stable (NOT rotate in 3-5 seconds anymore)
  await page.waitForTimeout(3000);
  const cue2 = await page.locator('#spoken').innerText();
  console.log(`[REQ 6.2] Cue after 3s: "${cue2.trim()}"`);
  if (cue1 !== cue2) {
    throw new Error(`FAIL: Cue rotated too fast within 3s!`);
  }

  // Take screenshot of active workout stage with all enhancements
  await page.screenshot({ path: path.join(artifactsDir, 'latest-ui-active-workout.png'), fullPage: true });

  // Complete sets and advance
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 1' }).click();
  await page.waitForTimeout(200);
  await page.locator('.set-hud-panel button', { hasText: 'Skip Break' }).click({ force: true });
  await page.waitForTimeout(200);
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 2' }).click();
  await page.waitForTimeout(200);
  await page.locator('.set-hud-panel button', { hasText: 'Skip Break' }).click({ force: true });
  await page.waitForTimeout(200);
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 3' }).click();
  await page.waitForTimeout(600);

  // Advance to summary
  const totalScreens = parseInt((await page.locator('#position').innerText()).split('/')[1].trim(), 10);
  while (true) {
    const curPos = (await page.locator('#position').innerText()).split('/')[0].trim();
    if (parseInt(curPos, 10) >= totalScreens) break;
    await page.locator('#next').click();
    await page.waitForTimeout(200);
  }

  // Finish Workout
  await page.locator('#next').click();
  await page.waitForTimeout(400);

  // Take screenshot of summary & logged sidebar
  await page.screenshot({ path: path.join(artifactsDir, 'latest-ui-summary-logged.png'), fullPage: true });

  console.log('=== ALL 5 USER ENHANCEMENTS VERIFIED AND CONFIRMED 100% PASS! ===');
  await browser.close();
}

verifyEnhancements().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
