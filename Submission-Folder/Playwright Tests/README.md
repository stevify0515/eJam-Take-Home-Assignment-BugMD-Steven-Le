# Playwright funnel test

These tests cover the happy-path BugMD Pest Defense Pro funnel:

1. Opens the landing page.
2. Clicks the primary funnel CTA.
3. Selects annual, quarterly, or one-time purchase when the offer page is present.
4. Completes the quiz with standard and XL home-size QA answers.
5. Clicks the quiz add-to-cart action.
6. Reads Shopify `/cart.js` and verifies the expected SKU and cart total.
7. Verifies subscription paths include a selling plan allocation and one-time paths do not.

Current SKU assertions:

- Annual standard home: `BG-PDPCNANN-08`, `$140.00`
- Annual XL home: `BG-PDPCNANN-08-XL`, `$196.00`
- Quarterly standard home: `BG-PDP2CNBT-03`, `$45.00`
- Quarterly XL home: `BG-PDP2CNBT-03-XL`, `$59.00`
- One-time standard home: `BG-PDP2CNBT-03`, `$55.00`
- One-time XL home: `BG-PDP2CNBT-03-XL`, `$69.00`

The test clears the Shopify cart at the start with `/cart/clear.js` when possible. It does not complete checkout or submit payment. The quiz add-to-cart action may navigate toward `/checkout` after the Ajax cart add completes, but the assertion stops at Shopify cart state.

The matrix is intentionally run serially because Shopify Ajax cart state and Shopify CLI proxying are more reliable when the six ecommerce scenarios do not compete for cart endpoints at the same time.

Run locally against a Shopify theme server:

```sh
BASE_URL=http://127.0.0.1:9293 npx playwright test
```

Run against the public Shopify storefront:

```sh
BASE_URL=https://wybmic-ua.myshopify.com npx playwright test
```

Price note: these are strict production-style price assertions for the current Shopify product setup. If product prices, selling-plan discounts, or subscription allocations change in Shopify admin, update the scenario matrix in `tests/funnel.spec.js` to match the intended cart totals.
