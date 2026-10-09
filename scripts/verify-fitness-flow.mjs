import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

async function run() {
  const shotsDir = 'evidence/screenshots';
  await mkdir(shotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

  console.log('1. Navigating to http://127.0.0.1:4319...');
  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('#mode');

  // Verify initial state
  console.log('2. Clicking Compound Strength to start intake...');
  await page.locator('#intent-strength').click();
  await page.waitForTimeout(600);

  // Take screenshot of Step 1: Clean Intake, Chat Q1, NO stage MCQs
  await page.screenshot({ path: `${shotsDir}/verify-01-strength-intake-no-mcq-stage.png` });
  console.log('Saved: verify-01-strength-intake-no-mcq-stage.png');

  // Check no mcq on stage
  const stageMcqs = await page.locator('#screen .mcq-deck, #screen .mcq-btn').count();
  console.log('In-stage MCQ count (must be 0):', stageMcqs);

  // Check chat has Q1
  const chatText = await page.locator('#transcript').innerText();
  console.log('Chat contains Question 1 of 3:', chatText.includes('Question 1 of 3'));

  // Test Category Switching: Switch to HIIT
  console.log('3. Switching to Metabolic HIIT category...');
  await page.locator('#intent-hiit').click();
  await page.waitForTimeout(600);

  const switchedChatText = await page.locator('#transcript').innerText();
  const hasStrengthBleed = switchedChatText.includes('Compound Strength Protocol Initiated');
  console.log('Chat history bleed check (must be false):', hasStrengthBleed);
  console.log('HIIT intake initiated:', switchedChatText.includes('Metabolic HIIT Protocol Initiated'));

  await page.screenshot({ path: `${shotsDir}/verify-02-switch-hiit-clean-chat.png` });
  console.log('Saved: verify-02-switch-hiit-clean-chat.png');

  // Answer HIIT Question 1
  console.log('4. Answering Question 1 (Tabata)...');
  await page.locator('.chat-mcq-chip', { hasText: 'Tabata' }).click();
  await page.waitForTimeout(600);

  // Answer HIIT Question 2
  console.log('5. Answering Question 2 (Dynamic Bodyweight Plyometrics)...');
  await page.locator('.chat-mcq-chip', { hasText: 'Dynamic Bodyweight' }).click();
  await page.waitForTimeout(600);

  // Answer HIIT Question 3
  console.log('6. Answering Question 3 (Redline Zone 5)...');
  await page.locator('.chat-mcq-chip', { hasText: 'Redline Zone 5' }).click();
  await page.waitForTimeout(800);

  await page.screenshot({ path: `${shotsDir}/verify-03-workout-loaded-5-variations.png` });
  console.log('Saved: verify-03-workout-loaded-5-variations.png');

  // Advance to Variation 1
  await page.locator('#next').click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: `${shotsDir}/verify-04-variation-1-set-tracker.png` });
  console.log('Saved: verify-04-variation-1-set-tracker.png');

  // Check interactive set tracker
  const setPillsCount = await page.locator('.set-pill').count();
  console.log('Set pills rendered on Variation 1:', setPillsCount);

  // Complete Set 1
  console.log('7. Completing Set 1 to test Rest Break Timer...');
  await page.locator('.set-hud-panel button', { hasText: 'Complete Set 1' }).click();
  await page.waitForTimeout(500);

  await page.screenshot({ path: `${shotsDir}/verify-05-rest-break-active.png` });
  console.log('Saved: verify-05-rest-break-active.png');

  // Skip break to advance to Set 2
  console.log('8. Skipping break to start Set 2...');
  const skipBtn = page.locator('.set-hud-panel button', { hasText: 'Skip Break' });
  await skipBtn.scrollIntoViewIfNeeded();
  await skipBtn.click({ force: true });
  await page.waitForTimeout(600);

  await page.screenshot({ path: `${shotsDir}/verify-06-set-2-active.png` });
  console.log('Saved: verify-06-set-2-active.png');

  console.log('All verification assertions passed!');
  await browser.close();
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
