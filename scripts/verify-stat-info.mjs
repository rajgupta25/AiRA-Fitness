import { chromium } from 'playwright';
import path from 'path';

const artifactsDir = '/Users/rajgupta/.gemini/antigravity/brain/ba0a93e0-3491-47e0-9ac4-58ed1a3300f1';

async function verifyStatInfo() {
  console.log('=== VERIFYING STAT "i" INFO BUTTONS & POPOVERS ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('#mode');

  // 1. Verify existence of all three "i" buttons
  const infoButtons = page.locator('.stat-info-btn');
  const count = await infoButtons.count();
  console.log(`[VERIFY 1] Found ${count} stat info ("i") buttons (Target: 3)`);
  if (count !== 3) {
    throw new Error(`FAIL: Expected 3 info buttons, found ${count}`);
  }

  // 2. Test "i" button on Active Session Burn
  const burnBtn = page.locator('.stat-info-btn[data-stat-info="burn"]');
  const burnBtnText = await burnBtn.innerText();
  console.log(`[VERIFY 2.1] Button 1 text: "${burnBtnText.trim()}"`);
  if (burnBtnText.trim() !== 'i') {
    throw new Error(`FAIL: Expected "i", got "${burnBtnText}"`);
  }

  await burnBtn.click();
  await page.waitForTimeout(300);

  const burnPopoverVisible = await page.locator('#stat-info-burn').isVisible();
  const burnTitle = await page.locator('#stat-info-burn .stat-info-popover-title').innerText();
  const burnDesc = await page.locator('#stat-info-burn .stat-info-popover-desc').innerText();
  const burnMeta = await page.locator('#stat-info-burn .stat-info-popover-meta').innerText();

  console.log(`[VERIFY 2.2] Burn Popover Visible: ${burnPopoverVisible}`);
  console.log(`[VERIFY 2.3] Title: "${burnTitle}"`);
  console.log(`[VERIFY 2.4] Desc: "${burnDesc}"`);
  console.log(`[VERIFY 2.5] Meta: "${burnMeta}"`);

  if (!burnPopoverVisible || !burnDesc.includes('MET') || !burnTitle.includes('Active Session Burn')) {
    throw new Error('FAIL: Active Session Burn popover content mismatch or not visible');
  }

  // Capture screenshot of Burn Info open
  await page.screenshot({ path: path.join(artifactsDir, 'stat-info-01-active-burn.png'), fullPage: true });

  // 3. Test "i" button on Intensity Target
  const intensityBtn = page.locator('.stat-info-btn[data-stat-info="intensity"]');
  await intensityBtn.click();
  await page.waitForTimeout(300);

  const intensityPopoverVisible = await page.locator('#stat-info-intensity').isVisible();
  const burnNowHidden = !(await page.locator('#stat-info-burn').evaluate(el => el.classList.contains('visible')));
  const intensityTitle = await page.locator('#stat-info-intensity .stat-info-popover-title').innerText();
  const intensityDesc = await page.locator('#stat-info-intensity .stat-info-popover-desc').innerText();

  console.log(`[VERIFY 3.1] Intensity Popover Visible: ${intensityPopoverVisible}, Burn Popover Closed: ${burnNowHidden}`);
  console.log(`[VERIFY 3.2] Intensity Title: "${intensityTitle}"`);
  console.log(`[VERIFY 3.3] Intensity Desc: "${intensityDesc}"`);

  if (!intensityPopoverVisible || !intensityDesc.includes('heart rate zones')) {
    throw new Error('FAIL: Intensity Target popover content mismatch or not visible');
  }

  // Capture screenshot of Intensity Info open
  await page.screenshot({ path: path.join(artifactsDir, 'stat-info-02-intensity-target.png'), fullPage: true });

  // 4. Test "i" button on Session Progress / Circuit Pace
  const progressBtn = page.locator('.stat-info-btn[data-stat-info="progress"]');
  await progressBtn.click();
  await page.waitForTimeout(300);

  const progressPopoverVisible = await page.locator('#stat-info-progress').isVisible();
  const progressTitle = await page.locator('#stat-info-progress .stat-info-popover-title').innerText();
  const progressDesc = await page.locator('#stat-info-progress .stat-info-popover-desc').innerText();

  console.log(`[VERIFY 4.1] Progress Popover Visible: ${progressPopoverVisible}`);
  console.log(`[VERIFY 4.2] Progress Title: "${progressTitle}"`);
  console.log(`[VERIFY 4.3] Progress Desc: "${progressDesc}"`);

  if (!progressPopoverVisible || !progressTitle.includes('Circuit Pace') || !progressDesc.includes('telemetry ring')) {
    throw new Error('FAIL: Session Progress / Circuit Pace popover content mismatch or not visible');
  }

  // Capture screenshot of Progress Info open
  await page.screenshot({ path: path.join(artifactsDir, 'stat-info-03-session-progress.png'), fullPage: true });

  // 5. Test Dismissal on Outside Click or Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const anyVisibleAfterEsc = await page.locator('.stat-info-popover.visible').count();
  console.log(`[VERIFY 5] Visible popovers after pressing Escape: ${anyVisibleAfterEsc} (Target: 0)`);
  if (anyVisibleAfterEsc !== 0) {
    throw new Error('FAIL: Popovers not dismissed on Escape key');
  }

  console.log('=== ALL STAT "i" INFO REQUIREMENTS VERIFIED 100% PASS! ===');
  await browser.close();
}

verifyStatInfo().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
