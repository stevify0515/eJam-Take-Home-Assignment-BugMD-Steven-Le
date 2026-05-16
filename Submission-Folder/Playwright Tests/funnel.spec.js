const { test, expect } = require('@playwright/test');

const STANDARD_SKU = 'BG-PDP2CNBT-03';
const STANDARD_XL_SKU = 'BG-PDP2CNBT-03-XL';
const ANNUAL_STANDARD_SKU = 'BG-PDPCNANN-08';
const ANNUAL_XL_SKU = 'BG-PDPCNANN-08-XL';
const DEFAULT_QUIZ_VARIANT = 'pest_selection';
const NO_PEST_QUIZ_VARIANT = 'common_area_pests';

const SCENARIOS = [
  {
    name: 'annual standard home',
    plan: 'annual',
    homeSizeTestId: 'home-size-small',
    expectedSku: ANNUAL_STANDARD_SKU,
    expectedPlanLabel: 'Annual prepay',
    expectedHomeSize: 'Under 4,500 sq ft',
    expectedCoverage: 'Standard coverage',
    expectsSellingPlan: true,
    expectedTotal: 14000,
  },
  {
    name: 'annual XL home',
    plan: 'annual',
    homeSizeTestId: 'home-size-large',
    expectedSku: ANNUAL_XL_SKU,
    expectedPlanLabel: 'Annual prepay',
    expectedHomeSize: '4,500-7,500 sq ft',
    expectedCoverage: 'Larger property / XL coverage',
    expectsSellingPlan: true,
    expectedTotal: 19600,
  },
  {
    name: 'quarterly standard home',
    plan: 'quarterly',
    homeSizeTestId: 'home-size-small',
    expectedSku: STANDARD_SKU,
    expectedPlanLabel: 'Quarterly subscription',
    expectedHomeSize: 'Under 4,500 sq ft',
    expectedCoverage: 'Standard coverage',
    expectsSellingPlan: true,
    expectedTotal: 4500,
  },
  {
    name: 'quarterly XL home',
    plan: 'quarterly',
    homeSizeTestId: 'home-size-large',
    expectedSku: STANDARD_XL_SKU,
    expectedPlanLabel: 'Quarterly subscription',
    expectedHomeSize: '4,500-7,500 sq ft',
    expectedCoverage: 'Larger property / XL coverage',
    expectsSellingPlan: true,
    expectedTotal: 5900,
  },
  {
    name: 'one-time standard home',
    plan: 'one-time',
    homeSizeTestId: 'home-size-small',
    expectedSku: STANDARD_SKU,
    expectedPlanLabel: 'One-time purchase',
    expectedHomeSize: 'Under 4,500 sq ft',
    expectedCoverage: 'Standard coverage',
    expectsSellingPlan: false,
    expectedTotal: 5500,
  },
  {
    name: 'one-time XL home',
    plan: 'one-time',
    homeSizeTestId: 'home-size-large',
    expectedSku: STANDARD_XL_SKU,
    expectedPlanLabel: 'One-time purchase',
    expectedHomeSize: '4,500-7,500 sq ft',
    expectedCoverage: 'Larger property / XL coverage',
    expectsSellingPlan: false,
    expectedTotal: 6900,
  },
];

test.describe('BugMD quiz funnel plan and home-size matrix', () => {
  test.describe.configure({ mode: 'serial' });

  for (const scenario of SCENARIOS) {
    test(`${scenario.name} adds the correct Shopify cart item`, async ({ page }, testInfo) => {
      await runFunnelScenario(page, testInfo, scenario);
    });
  }
});

test('common-area pest variant omits Selected Pests line item property', async ({ page }, testInfo) => {
  await runFunnelScenario(page, testInfo, {
    name: 'quarterly standard home without pest selection',
    plan: 'quarterly',
    quizVariant: NO_PEST_QUIZ_VARIANT,
    homeSizeTestId: 'home-size-small',
    expectedSku: STANDARD_SKU,
    expectedPlanLabel: 'Quarterly subscription',
    expectedHomeSize: 'Under 4,500 sq ft',
    expectedCoverage: 'Standard coverage',
    expectsSellingPlan: true,
    expectedTotal: 4500,
    expectsSelectedPestsProperty: false,
  });
});

async function runFunnelScenario(page, testInfo, scenario) {
  const quizVariant = scenario.quizVariant || DEFAULT_QUIZ_VARIANT;

  await page.goto('/');
  await unlockStorefrontIfNeeded(page);
  await page.evaluate((variant) => window.localStorage.setItem('bugmdQuizVariant', variant), quizVariant);
  await clearCart(page, testInfo);
  await page.goto('/');
  await assertStorefrontReady(page);

  await expect(page.getByTestId('start-quiz').first()).toBeVisible();
  await page.getByTestId('start-quiz').first().click();
  await page.waitForLoadState('domcontentloaded');

  await selectPlanAndOpenQuiz(page, testInfo, scenario.plan, quizVariant);
  await completeQuiz(page, scenario.homeSizeTestId, quizVariant);

  await blockCheckoutNavigation(page);
  const addToCartResult = waitForCartAdd(page);

  await page.getByTestId('add-plan-to-cart').last().click();
  await addToCartResult;

  await page.waitForURL('**/checkout**', { timeout: 5000 }).catch(() => null);

  const cart = await getCart(page);
  expect(cart.item_count).toBe(1);
  expect(cart.total_price).toBe(scenario.expectedTotal);
  expect((cart.items || []).map((item) => normalizeSku(item.sku))).toContain(scenario.expectedSku);

  const matchingItems = cart.items.filter((item) => normalizeSku(item.sku) === scenario.expectedSku);
  expect(matchingItems).toHaveLength(1);
  expect(matchingItems[0].quantity).toBe(1);
  expect(matchingItems[0].final_line_price).toBe(scenario.expectedTotal);
  expect(Boolean(matchingItems[0].selling_plan_allocation)).toBe(scenario.expectsSellingPlan);

  const properties = matchingItems[0].properties || {};
  expect(properties['ZIP Code']).toBe('92705');
  expect(properties['Home Size']).toBe(scenario.expectedHomeSize);
  expect(properties['Selected Plan']).toBe(scenario.expectedPlanLabel);
  expect(properties['Treatment Priority']).toBe('Prevent future pest problems');
  expect(properties['Pest 1']).toBeUndefined();
  expect(properties['Pest 2']).toBeUndefined();
  expect(properties['Pest 3']).toBeUndefined();
  expect(properties['All Selected Pests']).toBeUndefined();

  if (scenario.expectsSelectedPestsProperty === false) {
    expect(properties['Selected Pests']).toBeUndefined();
  } else {
    expect(properties['Selected Pests']).toBeTruthy();
    expect(properties['Selected Pests'].split(',').map((pest) => pest.trim()).filter(Boolean).length).toBeLessThanOrEqual(3);
  }

  const attributes = cart.attributes || {};
  expect(attributes['Selected plan']).toBe(scenario.expectedPlanLabel);
  expect(attributes['ZIP code']).toBe('92705');
  expect(attributes['Home size']).toBe(scenario.expectedHomeSize);
  expect(attributes['Coverage recommendation']).toBe(scenario.expectedCoverage);
  expect(attributes['Quiz variant']).toBe(quizVariant);
}

async function blockCheckoutNavigation(page) {
  // Return a blank page when the quiz redirects to /checkout.
  // route.abort() destroys the execution context mid-navigation; route.fulfill()
  // lets the navigation finish gracefully so the page stays alive for assertions.
  await page.route('**/checkout**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body></body></html>',
    });
  });
}

async function waitForCartAdd(page) {
  const globalErrorLocator = page.locator('[data-global-error]');
  const cartLog = [];

  function onResponse(response) {
    const url = response.url();
    if (!url.includes('/cart/add.js') && !url.includes('/cart/update.js')) return;
    const method = response.request().method();
    response.text().then((body) => {
      cartLog.push({ method, url, status: response.status(), statusText: response.statusText(), body: body.slice(0, 500) });
    }).catch(() => {
      cartLog.push({ method, url, status: response.status(), statusText: response.statusText(), body: '(unable to read)' });
    });
  }

  page.on('response', onResponse);

  try {
    const addResponse = await page.waitForResponse(
      (response) => response.url().includes('/cart/add.js') && response.request().method() === 'POST',
      { timeout: 25_000 }
    );

    if (!addResponse.ok()) {
      const errorText = await globalErrorLocator.innerText({ timeout: 2000 }).catch(() => '(unable to read error)');
      throw new Error(`Cart add returned ${addResponse.status()} ${addResponse.statusText()}: ${errorText}`);
    }

    return;
  } catch (addError) {
    const errorText = await globalErrorLocator.innerText({ timeout: 2000 }).catch(() => '');

    const updateFailureEntry = cartLog.find(
      (e) => e.url.includes('/cart/update.js') && e.method === 'POST' && e.status >= 400
    );
    const addFailureEntry = cartLog.find(
      (e) => e.url.includes('/cart/add.js') && e.method === 'POST' && e.status >= 400
    );

    const cartSummary = cartLog.length
      ? `Cart requests observed:\n  ${cartLog.map((e) => `${e.method} ${e.url} → ${e.status} ${e.statusText}`).join('\n  ')}`
      : 'No cart requests were observed.';

    if (errorText || updateFailureEntry || addFailureEntry) {
      const parts = [];
      if (updateFailureEntry) {
        parts.push(`Shopify /cart/update.js returned ${updateFailureEntry.status} ${updateFailureEntry.statusText}: ${updateFailureEntry.body}`);
      }
      if (addFailureEntry) {
        parts.push(`Shopify /cart/add.js returned ${addFailureEntry.status} ${addFailureEntry.statusText}: ${addFailureEntry.body}`);
      }
      if (errorText) {
        parts.push(`Quiz error element: "${errorText}"`);
      }
      throw new Error(`${parts.join('\n')}\n\n${cartSummary}`);
    }

    throw new Error(`${cartSummary}\n\nOriginal error: ${addError.message}`);
  } finally {
    page.off('response', onResponse);
  }
}

async function assertStorefrontReady(page) {
  const bodyText = await page.locator('body').innerText().catch(() => '');

  if (/connection needs to be verified|before you can proceed/i.test(bodyText)) {
    throw new Error('Shopify is showing a connection verification page. Run against a local Shopify theme server or wait/adjust the live store protection before running this E2E test again.');
  }
}

async function selectPlanAndOpenQuiz(page, testInfo, plan, quizVariant) {
  const quiz = page.locator('[data-bugmd-quiz]');
  const fallbackUrl = `/pages/pest-defense-pro-quiz?quizVariant=${quizVariant}&plan=${plan}`;

  if (await quiz.count()) {
    testInfo.annotations.push({
      type: 'route',
      description: `Landing CTA opened the quiz directly; using ${plan} query parameter fallback.`,
    });
    await page.goto(fallbackUrl);
    await expect(quiz).toBeVisible();
    return;
  }

  const planCard = page.getByTestId(`plan-${plan}`);
  if (!(await planCard.count())) {
    testInfo.annotations.push({
      type: 'route',
      description: `Offer plan selector was not present after landing CTA; opened quiz URL directly with ${plan} plan.`,
    });
    await page.goto(fallbackUrl);
    await expect(page.locator('[data-bugmd-quiz]')).toBeVisible();
    return;
  }

  if (plan === 'one-time' && !(await planCard.isVisible())) {
    await page.locator('[data-other-options-toggle]').click();
    await expect(planCard).toBeVisible();
  }

  await planCard.click();
  await expect(planCard).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('start-quiz').first().click();
  await expect(page.locator('[data-bugmd-quiz]')).toBeVisible();
}

async function completeQuiz(page, homeSizeTestId, quizVariant) {
  await expect(page.getByTestId('goal-prevention')).toBeVisible();
  await page.getByTestId('goal-prevention').check();
  await currentNext(page).click();

  await page.getByTestId('zip-input').fill('92705');
  await currentNext(page).click();

  await page.getByTestId(homeSizeTestId).check();
  await currentNext(page).click();

  if (quizVariant !== NO_PEST_QUIZ_VARIANT) {
    await expect(page.getByTestId('pest-ants')).toBeVisible();
    await page.getByTestId('pest-ants').check();
    await page.getByLabel('Spiders').check();
    await page.getByTestId('pest-roaches').check();
    await page.getByLabel('Mosquitoes').check();
    await currentNext(page).click();
  }

  await expect(page.getByTestId('add-plan-to-cart').first()).toBeVisible();
}

function currentNext(page) {
  return page.locator('[data-step-panel]:not([hidden]) [data-testid="quiz-next"]');
}

async function unlockStorefrontIfNeeded(page) {
  const passwordInput = page.locator('input[type="password"][name="password"]').first();

  if (!(await passwordInput.count())) {
    return;
  }

  if (!process.env.SHOPIFY_PASSWORD) {
    throw new Error('Storefront password page detected. Set SHOPIFY_PASSWORD to unlock the Shopify storefront.');
  }

  const modalDetails = page.locator('password-modal details').first();
  if (await modalDetails.count()) {
    await modalDetails.evaluate((details) => {
      details.open = true;
    });
  }

  await passwordInput.fill(process.env.SHOPIFY_PASSWORD);
  const passwordForm = passwordInput.locator('xpath=ancestor::form[1]');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => null),
    passwordForm.locator('button[type="submit"], button[name="commit"]').first().click(),
  ]);

  if (await passwordInput.isVisible().catch(() => false)) {
    throw new Error('Storefront password submission did not unlock the store.');
  }
}

async function clearCart(page, testInfo) {
  const response = await page.request.post('/cart/clear.js', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok()) {
    testInfo.annotations.push({
      type: 'cart-clear',
      description: `Could not clear cart before test. Shopify returned ${response.status()}.`,
    });
  }
}

async function getCart(page) {
  const body = await page.evaluate(() => {
    // Use the JSON cart endpoint directly — it always returns JSON and
    // does not trigger Shopify bot-protection the way page.request does.
    return fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error(`/cart.js returned ${r.status}`);
        return r.text();
      });
  });

  return JSON.parse(body);
}

function normalizeSku(sku) {
  return String(sku || '').trim().replace(/^SKU:\s*/i, '');
}
