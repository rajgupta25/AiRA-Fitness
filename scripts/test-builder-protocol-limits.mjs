import { chromium } from 'playwright';
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const artifactsDir = '/Users/rajgupta/.gemini/antigravity/brain/ba0a93e0-3491-47e0-9ac4-58ed1a3300f1';

async function runBuilderStressTest() {
  console.log('=== STARTING BUILDER TOOLS & PROTOCOL COMPREHENSIVE STRESS TEST ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR] ${err.message}`);
    errors.push(err.message);
  });

  await page.goto('http://127.0.0.1:4319');
  await page.waitForSelector('.brand-title');

  // STEP 1: OPEN BUILDER TOOLS & INSPECT PROTOCOL
  console.log('1. Inspecting Builder Tools & Protocol...');
  const builderDetails = page.locator('#builder');
  await builderDetails.evaluate(el => el.open = true);
  // Also open the inner details for "What the model receives next"
  await page.locator('#builder details').evaluate(el => el.open = true);
  await page.waitForTimeout(300);

  const stateJsonInitial = (await page.locator('#state-json').textContent()) || '';
  console.log('Initial #state-json snippet:', stateJsonInitial.slice(0, 150), '...');
  const parsedInitial = JSON.parse(stateJsonInitial);
  if (!parsedInitial.hasOwnProperty('ui_state') || !parsedInitial.hasOwnProperty('client_events')) {
    throw new Error('Protocol inspection failed: #state-json does not contain expected OpenUI fields');
  }
  console.log('-> Verified: Initial protocol state valid.\n');

  // STEP 2: LOAD WIRING SAMPLE / WORKOUT & RE-INSPECT PROTOCOL
  console.log('2. Loading Workout & Re-inspecting Protocol...');
  await page.locator('#sample').click();
  await page.waitForSelector('[data-statement="count1"]');
  const stateJsonLoaded = (await page.locator('#state-json').textContent()) || '';
  const parsedLoaded = JSON.parse(stateJsonLoaded);
  if (!parsedLoaded.ui_state.includes('Screen') && !parsedLoaded.ui_state.includes('count1')) {
    throw new Error('Protocol update failed: ui_state missing statements');
  }
  console.log('-> Verified: Protocol echoes live OpenUI AST successfully.\n');

  // STEP 3: TRY LOCAL PATCH - VALID PATCH
  console.log('3. Testing Local Patch: Valid statement...');
  const patchInput = page.locator('#patch');
  const applyBtn = page.locator('#apply-patch');
  const patchStatus = page.locator('#patch-status');

  await patchInput.fill('count1 = Keyword("99", "Heavy reps")');
  await applyBtn.click();
  const patchResultText = await patchStatus.innerText();
  console.log(`Patch status result: "${patchResultText}"`);
  if (!patchResultText.includes('Patch accepted')) {
    throw new Error('Valid patch was not accepted');
  }
  const count1Text = await page.locator('[data-statement="count1"]').innerText();
  console.log(`Updated statement text in DOM: "${count1Text}"`);
  if (!count1Text.includes('99')) {
    throw new Error('DOM did not reflect patched statement');
  }
  console.log('-> Verified: Valid patch accepted and rendered.\n');

  // STEP 4: TRY LOCAL PATCH - INVALID PATCH (SYNTAX / UNKNOWN)
  console.log('4. Testing Local Patch: Invalid AST / Syntax...');
  await patchInput.fill('totally_invalid_syntax = NonExistentComponent(1234)');
  await applyBtn.click();
  const invalidStatus = await patchStatus.innerText();
  console.log(`Invalid patch status: "${invalidStatus}"`);
  if (!invalidStatus.includes('Invalid patch')) {
    throw new Error('Invalid patch was not flagged properly');
  }
  // Verify screen state preserved
  const count1AfterInvalid = await page.locator('[data-statement="count1"]').innerText();
  if (!count1AfterInvalid.includes('99')) {
    throw new Error('Previous screen state was lost after invalid patch');
  }
  console.log('-> Verified: Invalid patch rejected, prior valid state preserved intact.\n');

  // STEP 5: TRY LOCAL PATCH - XSS / CODE INJECTION TEST
  console.log('5. Testing Local Patch: XSS / Script injection attack...');
  await patchInput.fill('count1 = Keyword("<img src=x onerror=alert(1)>", "XSS Test")');
  await applyBtn.click();
  const xssImgCount = await page.locator('#screen img').count();
  console.log(`Number of img elements injected in #screen: ${xssImgCount}`);
  if (xssImgCount > 0) {
    throw new Error('SECURITY VIOLATION: Malicious img tag rendered into #screen!');
  }
  const xssRawText = await page.locator('[data-statement="count1"]').innerText();
  console.log(`Escaped text in DOM: "${xssRawText}"`);
  if (!xssRawText.includes('<img src=x')) {
    throw new Error('Escaped text missing');
  }
  console.log('-> Verified: Script/img injection safely sanitized as inert string.\n');

  // STEP 6: TEST FAULT INJECTION - SCHEMA FAILURE & RETRY
  console.log('6. Testing Fault Injection: Schema Failure & Retry Recovery...');
  const faultSelect = page.locator('#fault');
  await faultSelect.selectOption('schema');
  await page.locator('#message').fill('next');
  await page.locator('#send').click();
  await page.waitForTimeout(600);

  const errorBanner = page.locator('#error');
  const errorVisible = await errorBanner.isVisible();
  const errorText = await page.locator('#error-message').innerText();
  console.log(`Schema failure detected: visible=${errorVisible}, text="${errorText}"`);
  if (!errorVisible || !errorText.includes('invalid component schema')) {
    throw new Error('Schema failure did not trigger expected error banner');
  }
  // Verify previous screen is still visible
  const screenContentDuringFault = await page.locator('#screen').innerText();
  if (!screenContentDuringFault.includes('XSS Test') && !screenContentDuringFault.includes('Sample value')) {
    throw new Error('Screen crashed during schema fault');
  }

  // Click Retry
  console.log('Clicking Retry button...');
  await page.locator('#retry').click();
  await page.waitForTimeout(800);
  const errorAfterRetry = await errorBanner.isVisible();
  console.log(`Error banner visible after retry: ${errorAfterRetry}`);
  if (errorAfterRetry) {
    throw new Error('Retry did not clear error banner');
  }
  console.log('-> Verified: Schema fault handled gracefully, screen preserved, retry recovered.\n');

  // STEP 7: TEST FAULT INJECTION - REQUEST FAILURE & RETRY
  console.log('7. Testing Fault Injection: Request Failure & Retry Recovery...');
  await faultSelect.selectOption('request');
  await page.locator('#message').fill('next');
  await page.locator('#send').click();
  await page.waitForTimeout(600);

  const reqErrorVisible = await errorBanner.isVisible();
  const reqErrorText = await page.locator('#error-message').innerText();
  console.log(`Request failure detected: visible=${reqErrorVisible}, text="${reqErrorText}"`);
  if (!reqErrorVisible || !reqErrorText.includes('model request failure')) {
    throw new Error('Request failure did not trigger expected error banner');
  }

  // Click Retry
  console.log('Clicking Retry button...');
  await page.locator('#retry').click();
  await page.waitForTimeout(800);
  const reqErrorAfterRetry = await errorBanner.isVisible();
  if (reqErrorAfterRetry) {
    throw new Error('Retry did not clear request error');
  }
  console.log('-> Verified: Request fault handled gracefully, retry recovered.\n');

  // STEP 8: TEST FAULT INJECTION - SLOW & INTERRUPTION
  console.log('8. Testing Fault Injection: Slow Request & Interruption Handling...');
  await faultSelect.selectOption('slow');
  await page.locator('#message').fill('/demo');
  await page.locator('#send').click();
  const pendingVisible = await page.locator('#pending').isVisible();
  console.log(`Pending indicator visible during slow request: ${pendingVisible}`);

  // Interrupt mid-flight with a new message
  console.log('Interrupting pending slow request with "next"...');
  await page.locator('#message').fill('next');
  await page.locator('#send').click();
  await page.waitForTimeout(2800);
  const finalPending = await page.locator('#pending').isVisible();
  console.log(`Pending indicator after interruption completed: ${finalPending}`);
  if (finalPending) {
    throw new Error('Request hung after interruption');
  }
  console.log('-> Verified: Mid-flight interruption executed safely without crash.\n');

  // STEP 9: TEST EVIDENCE CAPTURE - DOWNLOAD RUN JSON & AUDIT SECRETS
  console.log('9. Testing Evidence Capture & Run Export Audit...');
  await page.locator('#run-label').selectOption('after');
  await page.locator('#note').fill('Rigorous protocol validation: tested schema fault, request fault, slow interruption, and local patch sanitization. Zero credential exposure verified.');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  const downloadPath = path.join(process.cwd(), 'runs', 'builder-stress-test-evidence.json');
  await download.saveAs(downloadPath);

  const exportContent = await readFile(downloadPath, 'utf8');
  console.log(`Saved run JSON to: ${downloadPath} (${exportContent.length} bytes)`);

  // Verify format and redacting in exported run JSON
  const parsedRun = JSON.parse(exportContent);
  if (parsedRun.format !== 'aira-workout-run-v1') {
    throw new Error(`Unexpected format in exported JSON: ${parsedRun.format}`);
  }
  if (!parsedRun.events || !Array.isArray(parsedRun.events) || parsedRun.events.length === 0) {
    throw new Error('Exported run has no events recorded');
  }
  if (!parsedRun.state || !parsedRun.state.ui_state) {
    throw new Error('Exported run has no ui_state recorded');
  }

  // Check for credential leaks in exported JSON
  const sensitivePatterns = [
    /sk-[a-zA-Z0-9_-]{16,}/,
    /Bearer [a-zA-Z0-9._-]{24,}/,
    /OPENAI_API_KEY/,
    /CLAUDE_CODE_OAUTH_TOKEN/,
    /X-Local-Token/
  ];
  for (const pat of sensitivePatterns) {
    if (pat.test(exportContent)) {
      throw new Error(`SECURITY LEAK: Exported JSON contains matched pattern: ${pat}`);
    }
  }
  console.log('-> Verified: Exported run JSON conforms to schema and zero credentials leaked.\n');

  // STEP 10: CAPTURE BUILDER SCREENSHOTS
  console.log('10. Capturing Builder Stress Test Screenshots...');
  const shotBuilder = path.join(artifactsDir, 'builder-tools-stress-test.png');
  await page.screenshot({ path: shotBuilder, fullPage: false });
  console.log(`Saved screenshot: ${shotBuilder}`);

  await browser.close();

  if (errors.length > 0) {
    throw new Error(`Browser encountered ${errors.length} unhandled errors: ${errors.join('; ')}`);
  }

  console.log('\n=== ALL BUILDER TOOLS & PROTOCOL STRESS TESTS PASSED WITH 100% SUCCESS ===');
}

runBuilderStressTest().catch(err => {
  console.error('\n❌ STRESS TEST FAILED:', err);
  process.exit(1);
});
