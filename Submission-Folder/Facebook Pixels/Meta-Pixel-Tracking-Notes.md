# BugMD Meta Pixel tracking

This funnel uses Shopify Customer Events for Meta Pixel install/dispatch. Do not install Meta Pixel in `layout/theme.liquid`, and do not add another Meta Pixel app/snippet for pixel ID `779746252761607`.

The theme code only publishes safe custom funnel events with `Shopify.analytics.publish`. The Meta Pixel init and event forwarding code below should be pasted manually into Shopify Admin -> Settings -> Customer events -> Custom pixel.

## Shopify Custom Pixel code

Paste this JavaScript-only snippet into the Shopify Custom Pixel editor. Do not wrap it in `<script>` or `<noscript>` tags.

```js
const META_PIXEL_ID = '779746252761607';
const DEBUG = false;

const FUNNEL_EVENTS = [
  'LandingViewed',
  'LandingCtaClicked',
  'OfferViewed',
  'PlanSelected',
  'OfferCtaClicked',
  'QuizStarted',
  'QuizStepViewed',
  'QuizStepCompleted',
  'QuizValidationError',
  'QuizCompleted',
  'CheckoutClicked',
  'ExperimentViewed',
];

const CUSTOM_ALLOWED_KEYS = {
  coverage_recommendation: true,
  destination: true,
  experiment_name: true,
  funnel_name: true,
  goal_count: true,
  goal_type: true,
  has_subscription: true,
  has_zip: true,
  home_size_bucket: true,
  offer_sku: true,
  page_type: true,
  pest_count: true,
  quiz_variant: true,
  selected_plan: true,
  source: true,
  step_index: true,
  step_name: true,
  validation_step: true,
};

loadMetaPixel();
trackMeta('init', META_PIXEL_ID);

if (typeof analytics !== 'undefined' && analytics && typeof analytics.subscribe === 'function') {
  analytics.subscribe('page_viewed', (event) => {
    trackStandard('PageView', {}, event);
  });

  analytics.subscribe('product_viewed', (event) => {
    const variant = event.data && event.data.productVariant;
    const product = variant && variant.product;
    trackStandard('ViewContent', {
      content_ids: [variant && (variant.sku || variant.id)].filter(Boolean).map(String),
      content_name: product && product.title,
      content_type: 'product',
      currency: getCurrency(variant && variant.price),
      value: getAmount(variant && variant.price),
    }, event);
  });

  analytics.subscribe('product_added_to_cart', (event) => {
    const line = event.data && event.data.cartLine;
    const merchandise = line && line.merchandise;
    const product = merchandise && merchandise.product;
    trackStandard('AddToCart', {
      content_ids: [merchandise && (merchandise.sku || merchandise.id)].filter(Boolean).map(String),
      content_name: product && product.title,
      content_type: 'product',
      currency: getCurrency(line && line.cost && line.cost.totalAmount),
      value: getAmount(line && line.cost && line.cost.totalAmount),
    }, event);
  });

  analytics.subscribe('checkout_started', (event) => {
    const checkout = event.data && event.data.checkout;
    trackStandard('InitiateCheckout', {
      content_ids: getCheckoutContentIds(checkout),
      content_type: 'product',
      currency: getCurrency(checkout && checkout.totalPrice),
      num_items: getCheckoutItemCount(checkout),
      value: getAmount(checkout && checkout.totalPrice),
    }, event);
  });

  analytics.subscribe('checkout_completed', (event) => {
    const checkout = event.data && event.data.checkout;
    trackStandard('Purchase', {
      content_ids: getCheckoutContentIds(checkout),
      content_type: 'product',
      currency: getCurrency(checkout && checkout.totalPrice),
      num_items: getCheckoutItemCount(checkout),
      value: getAmount(checkout && checkout.totalPrice),
    }, event);
  });

  FUNNEL_EVENTS.forEach((eventName) => {
    analytics.subscribe(eventName, (event) => {
      const payload = sanitizeCustomPayload(event.customData || event.data || {});
      log('Meta custom event', eventName, payload);
      trackMeta('trackCustom', eventName, payload, getEventOptions(event));
    });
  });
} else {
  log('Shopify analytics.subscribe unavailable; skipped Meta Pixel subscriptions');
}

function loadMetaPixel() {
  if (window.fbq) return;

  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
}

function trackStandard(eventName, payload, event) {
  const safePayload = cleanObject(payload);
  log('Meta standard event', eventName, safePayload);
  trackMeta('track', eventName, safePayload, getEventOptions(event));
}

function trackMeta() {
  if (typeof window.fbq !== 'function') {
    log('Meta fbq unavailable; skipped', arguments[0]);
    return;
  }

  window.fbq.apply(window, arguments);
}

function sanitizeCustomPayload(payload) {
  const safePayload = {};
  Object.keys(payload || {}).forEach((key) => {
    if (!CUSTOM_ALLOWED_KEYS[key]) return;
    const value = payload[key];
    if (value === undefined || value === null || value === '') return;
    safePayload[key] = value;
  });
  return safePayload;
}

function cleanObject(payload) {
  const cleaned = {};
  Object.keys(payload || {}).forEach((key) => {
    const value = payload[key];
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    cleaned[key] = value;
  });
  return cleaned;
}

function getEventOptions(event) {
  return event && event.id ? { eventID: event.id } : {};
}

function getAmount(money) {
  if (!money) return undefined;
  const amount = typeof money.amount === 'string' ? Number(money.amount) : money.amount;
  return Number.isFinite(amount) ? amount : undefined;
}

function getCurrency(money) {
  return money && (money.currencyCode || money.currency);
}

function getCheckoutContentIds(checkout) {
  return getCheckoutLineItems(checkout)
    .map((line) => {
      const variant = getLineVariant(line);
      return variant && (variant.sku || variant.id);
    })
    .filter(Boolean)
    .map(String);
}

function getCheckoutItemCount(checkout) {
  return getCheckoutLineItems(checkout).reduce((total, line) => {
    return total + (Number(line.quantity) || 0);
  }, 0);
}

function getCheckoutLineItems(checkout) {
  if (!checkout || !checkout.lineItems) return [];
  if (Array.isArray(checkout.lineItems)) return checkout.lineItems;
  if (Array.isArray(checkout.lineItems.nodes)) return checkout.lineItems.nodes;
  return [];
}

function getLineVariant(line) {
  return line && (line.variant || line.merchandise);
}

function log() {
  if (!DEBUG) return;
  console.log.apply(console, arguments);
}
```

## Save, connect, and test

1. In Shopify Admin, go to Settings -> Customer events.
2. Click Add custom pixel, name it `BugMD Meta Pixel`, and paste the JavaScript above.
3. Save the pixel, then click Connect.
4. Keep `DEBUG = false` for production. Temporarily set it to `true` only while debugging in Shopify preview.
5. Confirm there is no other Meta Pixel snippet, Meta app pixel, or hard-coded `fbq` install using pixel ID `779746252761607`.

## Event contract

Standard Shopify events are emitted by Shopify and forwarded by the Custom Pixel code:

- `page_viewed` -> Meta `PageView`
- `product_viewed` -> Meta `ViewContent`
- `product_added_to_cart` -> Meta `AddToCart`
- `checkout_started` -> Meta `InitiateCheckout`
- `checkout_completed` -> Meta `Purchase`

Custom funnel events are published by the theme and forwarded as Meta custom events:

- `LandingViewed`
- `LandingCtaClicked`
- `OfferViewed`
- `PlanSelected`
- `OfferCtaClicked`
- `QuizStarted`
- `QuizStepViewed`
- `QuizStepCompleted`
- `QuizValidationError`
- `QuizCompleted`
- `CheckoutClicked`
- `ExperimentViewed`

Theme custom events intentionally avoid raw ZIP code, email, phone, name, street address, and other PII. The safe payload uses fields such as `has_zip`, `home_size_bucket`, `pest_count`, `selected_plan`, `experiment_name`, `quiz_variant`, `step_name`, `step_index`, `coverage_recommendation`, and `offer_sku`.

## A/B readiness

The quiz tracking payload includes `quiz_variant` on every quiz event. Supported values are `pest_selection` and `common_area_pests`. The active experiment is `pest_step_variant`; it uses URL overrides, then sticky browser `localStorage`, then a 50/50 client-side assignment. `ExperimentViewed` fires once when a quiz session initializes and includes `experiment_name`, `quiz_variant`, `funnel_name`, and `selected_plan` when available.

## Verification

Use Shopify Pixel Helper to confirm the Customer Events pixel is connected and receiving subscribed events. Use Meta Pixel Helper to confirm pixel ID `779746252761607` fires and that standard/custom event names appear. Use browser DevTools -> Network and filter for `tr/?id=779746252761607` or `facebook.com/tr` to inspect event requests.

Manual QA checklist:

- Open the landing page and verify `LandingViewed` and Meta `PageView`.
- Click the landing CTA and verify `LandingCtaClicked`.
- Open the offer page and verify `OfferViewed`.
- Select annual, quarterly, and one-time and verify `PlanSelected` with the correct `selected_plan`, `offer_sku`, and `has_subscription`.
- Click Get My Custom Plan and verify `OfferCtaClicked` with the quiz destination.
- Complete quiz steps and verify `QuizStepViewed` and `QuizStepCompleted`.
- Trigger a validation error and verify `QuizValidationError`.
- Reach review and verify `QuizCompleted`.
- Verify `ExperimentViewed` fires once per quiz session.
- Click Proceed to Checkout and verify `CheckoutClicked`; also verify Shopify/Meta standard `AddToCart` and `InitiateCheckout` when Shopify emits those lifecycle events.
- Confirm no raw ZIP, email, phone, name, address, pest list, or other PII appears in Meta event payloads.
- Confirm Meta Pixel Helper shows pixel ID `779746252761607`.
