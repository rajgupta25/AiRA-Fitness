import { chromium } from 'playwright';
import path from 'path';

const artifactsDir = '/Users/rajgupta/.gemini/antigravity/brain/ba0a93e0-3491-47e0-9ac4-58ed1a3300f1';

async function verifyGapRefinements() {
  console.log('=== VERIFYING GAP REDUCTIONS & LAYOUT TIGHTNESS ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('#mode');

  // Check computed CSS values
  const statMarginBottom = await page.locator('.stat-highlight-row').evaluate(el => window.getComputedStyle(el).marginBottom);
  const workspaceGap = await page.locator('.workspace').evaluate(el => window.getComputedStyle(el).gap);
  const workoutColGap = await page.locator('.workout-stage-column').evaluate(el => window.getComputedStyle(el).gap);

  console.log(`[CHECK 1] .stat-highlight-row marginBottom: ${statMarginBottom} (Expected: 12px)`);
  console.log(`[CHECK 2] .workspace gap: ${workspaceGap} (Expected: 12px)`);
  console.log(`[CHECK 3] .workout-stage-column gap: ${workoutColGap} (Expected: 8px)`);

  if (statMarginBottom !== '12px') throw new Error(`Unexpected statMarginBottom: ${statMarginBottom}`);
  if (workspaceGap !== '12px') throw new Error(`Unexpected workspaceGap: ${workspaceGap}`);
  if (workoutColGap !== '8px') throw new Error(`Unexpected workoutColGap: ${workoutColGap}`);

  // Measure bounding boxes at initial state
  const statBoxInitial = await page.locator('.stat-highlight-row').boundingBox();
  const workspaceBoxInitial = await page.locator('.workspace').boundingBox();
  const measuredGap1 = workspaceBoxInitial.y - (statBoxInitial.y + statBoxInitial.height);
  console.log(`[MEASUREMENT 1] Gap between Stat Cards and Workspace: ${measuredGap1}px`);

  // Start HIIT workout to populate Active Workout Stage
  await page.locator('#intent-hiit').click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Tabata")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Tabata' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Kettlebell")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Kettlebell' }).click();
  await page.waitForSelector('.chat-mcq-chip:has-text("Redline")', { timeout: 10000 });
  await page.locator('.chat-mcq-chip', { hasText: 'Redline' }).click();
  await page.waitForSelector('#split-tracker .split-tracker-item', { timeout: 10000 });

  await page.waitForTimeout(600);

  // Measure bounding boxes during active workout
  const stageColBox = await page.locator('.workout-stage-column').boundingBox();
  const chatColBox = await page.locator('.conversation').boundingBox();
  const measuredGap2 = chatColBox.x - (stageColBox.x + stageColBox.width);
  console.log(`[MEASUREMENT 2] Gap between Stage Column and Chat Panel: ${measuredGap2}px`);

  const previewBox = await page.locator('.preview').boundingBox();
  const spokenBox = await page.locator('#spoken-lane').boundingBox();
  const measuredGap3 = spokenBox.y - (previewBox.y + previewBox.height);
  console.log(`[MEASUREMENT 3] Gap between Workout Stage Preview and Coach Voice Cues: ${measuredGap3}px`);

  // Take screenshot of active workout stage with tightened gaps
  const activeWorkoutScreenshot = path.join(artifactsDir, 'tightened-gaps-active-workout.png');
  await page.screenshot({ path: activeWorkoutScreenshot, fullPage: false });
  console.log(`Screenshot saved: ${activeWorkoutScreenshot}`);

  await browser.close();
  console.log('=== ALL GAP VERIFICATIONS PASSED SUCCESSFULLY ===');
}

verifyGapRefinements().catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
