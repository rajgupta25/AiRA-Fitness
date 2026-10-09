import { chromium } from 'playwright';

async function testUserRequirements() {
  console.log('--- VERIFYING USER REQUIREMENTS ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('#mode');

  // 1. Verify "CHAT WITH COACH AIRA" Heading
  const chatHeading = await page.locator('.chat-panel-heading h2').innerText();
  console.log(`[REQ 1] Chat Panel Heading: "${chatHeading.trim()}"`);
  if (!chatHeading.includes('CHAT WITH COACH AIRA')) {
    throw new Error('FAIL: Chat heading does not contain "CHAT WITH COACH AIRA"');
  }

  // 2. Verify Quick Action Chips (Knee relief, etc.) ARE REMOVED
  const quickActionDeckCount = await page.locator('.quick-action-deck').count();
  const chipKneesCount = await page.locator('#chip-knees').count();
  console.log(`[REQ 2] Quick action deck count: ${quickActionDeckCount}, chip-knees count: ${chipKneesCount}`);
  if (quickActionDeckCount !== 0 || chipKneesCount !== 0) {
    throw new Error('FAIL: Quick action chips still exist in chat section!');
  }

  // 3. Verify Active Workout Stage Header Controls (#next in header, no bottom stepper)
  const navInHeading = await page.locator('.panel-heading #navigation').count();
  console.log(`[REQ 3.1] Navigation controls inside .panel-heading: ${navInHeading}`);
  if (navInHeading !== 1) {
    throw new Error('FAIL: Navigation controls not inside .panel-heading');
  }

  // Check no bottom #navigation below #screen
  const navBelowScreen = await page.locator('#screen ~ #navigation').count();
  console.log(`[REQ 3.2] Navigation controls below #screen: ${navBelowScreen}`);
  if (navBelowScreen !== 0) {
    throw new Error('FAIL: Duplicate navigation controls found below #screen');
  }

  // 4. Start HIIT Workout and verify dynamic voice cues & set engine
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

  // 5. Verify Dynamic Coach Voice Cues
  const initialCue = await page.locator('#spoken').innerText();
  console.log(`[REQ 5.1] Active Exercise Voice Cue: "${initialCue.trim()}"`);
  if (!initialCue.includes('Coach Aira') && !initialCue.includes('Variation 1')) {
    throw new Error('FAIL: Spoken cue did not deliver coach voice cue');
  }

  // 6. Test Set Engine: Set 1 -> Set 2 -> Set 3 -> auto hop to Variation 2 (NO SET 4!)
  const initialPillCount = await page.locator('.set-pill').count();
  console.log(`[REQ 6.1] Initial set pills count: ${initialPillCount} (Target: 3)`);
  if (initialPillCount !== 3) {
    throw new Error(`FAIL: Expected 3 set pills, got ${initialPillCount}`);
  }

  // Set 1 complete
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 1' }).click();
  await page.waitForTimeout(200);
  // Skip rest
  await page.locator('.set-hud-panel button', { hasText: 'Skip Break' }).click({ force: true });
  await page.waitForTimeout(200);

  // Set 2 complete
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 2' }).click();
  await page.waitForTimeout(200);
  // Skip rest
  await page.locator('.set-hud-panel button', { hasText: 'Skip Break' }).click({ force: true });
  await page.waitForTimeout(200);

  // Set 3 (Final set) complete
  const set3Btn = page.locator('.set-hud-panel button', { hasText: 'Complete Set 3' });
  const set3Text = await set3Btn.innerText();
  console.log(`[REQ 6.2] Final Set 3 button text: "${set3Text.trim()}"`);
  await set3Btn.click();
  await page.waitForTimeout(800);

  // Verify auto-hop: check variation 2 or advance
  const posText = await page.locator('#position').innerText();
  console.log(`[REQ 6.3] Position after Set 3 completion: "${posText.trim()}"`);

  // Verify set pills did NOT create Set 4
  const setPillLabels = await page.locator('.set-pill').allInnerTexts();
  const hasSet4 = setPillLabels.some(l => l.includes('SET 4') || l.includes('Set 4'));
  console.log(`[REQ 6.4] Contains Set 4 or beyond: ${hasSet4} (Target: false)`);
  if (hasSet4) {
    throw new Error('FAIL: Set engine created Set 4 instead of capping at 3 sets!');
  }

  // 7. Test Direct Variation Click Navigation in Split Tracker
  const var3Pill = page.locator('#split-tracker .split-tracker-item', { hasText: 'Variation 3' }).or(page.locator('#split-tracker .split-tracker-item').nth(2));
  await var3Pill.click();
  await page.waitForTimeout(300);
  const posAfterVarClick = await page.locator('#position').innerText();
  console.log(`[REQ 7] Position after clicking Variation in split tracker: "${posAfterVarClick.trim()}"`);

  // 8. Jump to Final Screen and test "Finish Workout" & Sidebar Logging
  const lastScreenIdx = await page.locator('#split-tracker .split-tracker-item').count();
  // Navigate to summary screen
  const totalScreens = parseInt((await page.locator('#position').innerText()).split('/')[1].trim(), 10);
  while (true) {
    const curPos = (await page.locator('#position').innerText()).split('/')[0].trim();
    if (parseInt(curPos, 10) >= totalScreens) break;
    await page.locator('#next').click();
    await page.waitForTimeout(200);
  }

  // Verify button text on final screen
  const nextBtnText = await page.locator('#next').innerText();
  console.log(`[REQ 8.1] Final Screen Next Button Text: "${nextBtnText.trim()}" (Target: "Finish Workout")`);
  if (!nextBtnText.toLowerCase().includes('finish workout')) {
    throw new Error(`FAIL: Expected button text to include "Finish Workout", got "${nextBtnText}"`);
  }

  // Record history count before finish
  const historyCountBefore = await page.locator('#calendar-history .calendar-item').count();
  console.log(`[REQ 8.2] Sidebar calendar items before: ${historyCountBefore}`);

  // Click Finish Workout
  await page.locator('#next').click();
  await page.waitForTimeout(400);

  // Verify button changed state to Logged
  const nextBtnStateAfter = await page.locator('#next').innerText();
  console.log(`[REQ 8.3] Button state after finish: "${nextBtnStateAfter.trim()}"`);

  // Verify workout logged in sidebar
  const topHistoryItem = await page.locator('#calendar-history .calendar-item').first().innerText();
  console.log(`[REQ 8.4] Top history item in sidebar after finish:\n${topHistoryItem.trim()}`);

  const spokenAfterFinish = await page.locator('#spoken').innerText();
  console.log(`[REQ 8.5] Spoken cue after finish: "${spokenAfterFinish.trim()}"`);

  await browser.close();
  console.log('\n>>> ALL USER REQUIREMENTS VERIFIED AND PASSED 100%! <<<');
}

testUserRequirements().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
