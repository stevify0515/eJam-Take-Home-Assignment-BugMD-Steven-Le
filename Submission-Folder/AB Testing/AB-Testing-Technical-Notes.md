# BugMD Quiz A/B Testing

## Experiment

Experiment name: `pest_step_variant`

Funnel name: `bugmd_pest_defense_pro`

This is a lightweight MVP experiment for the Pest Defense Pro quiz funnel. It keeps one Shopify quiz page, one Liquid section, and one JavaScript code path. The variant changes the active quiz step configuration and review copy instead of duplicating the quiz page.

## Variants

`pest_selection`

- Shows the pest selection step after home size.
- Lets shoppers select pests such as ants, spiders, roaches, mosquitoes, fleas, ticks, and similar outdoor pests.
- Review copy says: "Formula based on the pests you chose."
- Review summarizes selected pests when present.
- If no pests were selected, review shows: "General outdoor pest protection."

`common_area_pests`

- Skips the pest selection step.
- Sends shoppers from home size directly to review.
- Review copy says: "Formula based on common pests found in your area."
- Uses the ZIP/location context already entered in the quiz, but does not claim a real pest lookup.
- Review uses the safe fallback: "Common seasonal pests in your area."

## Assignment Logic

Assignment happens in `assets/bugmd-funnel-tracking.js` so landing, offer, and quiz events agree on the same variant.

1. If `?quizVariant=pest_selection` or `?quizVariant=common_area_pests` is present, use it and persist it.
2. If no valid URL override exists, read `localStorage.bugmdQuizVariant`.
3. If the stored value is valid, use it.
4. If there is no valid stored value, randomly assign 50/50 and persist it to `localStorage.bugmdQuizVariant`.

The Shopify theme editor does not choose the A/B variant. Variant assignment is intentionally controlled by URL override, localStorage, then random 50/50 assignment in `bugmd-funnel-tracking.js`.

URL overrides intentionally replace the stored assignment. This keeps QA deterministic and lets testers switch variants without manually clearing storage.

## Why localStorage

`localStorage` is enough for this MVP because the goal is a sticky browser-level assignment, not a full experimentation platform. It avoids backend work, theme duplication, customer identity requirements, and third-party dependency risk. The tradeoff is that assignment is per browser/device and can reset when storage is cleared.

## Why IP Is Not Used

IP address is not used because it is not available to this theme JavaScript in a clean, privacy-minded way, can be shared by many people, can change during a session, and would add unnecessary complexity for a simple funnel test. The experiment does not need geolocation or identity resolution.

## QA Overrides

Open the quiz with either override:

- `/pages/pest-defense-pro-quiz?plan=quarterly&quizVariant=pest_selection`
- `/pages/pest-defense-pro-quiz?plan=quarterly&quizVariant=common_area_pests`

The offer page also appends the resolved `quizVariant` to its quiz CTA after assignment, which makes navigation into the quiz easier to inspect.

## Tracked Events

Theme events include `quiz_variant` where relevant, including:

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

The quiz also emits `ExperimentViewed` once when a quiz session initializes. Payload:

- `experiment_name`: `pest_step_variant`
- `quiz_variant`: `pest_selection` or `common_area_pests`
- `funnel_name`: `bugmd_pest_defense_pro`
- `selected_plan`: included when available

Meta custom pixel forwarding must allow `experiment_name` and `quiz_variant`. It must not forward raw ZIP code, email, phone, name, address, raw pest names, or other PII. Continue using `has_zip` instead of raw ZIP and `pest_count` instead of raw pest names for Meta.

## Production Scaling

If this grows beyond an MVP, move assignment to a server-side or edge-side experiment service that can provide stable bucketing, traffic allocation controls, holdouts, analytics joins, and experiment lifecycle management. Keep the same theme-facing contract where the quiz receives a resolved variant key and derives steps from a centralized config.

## Manual QA Checklist

- Open quiz with `?quizVariant=pest_selection` and confirm pest step appears.
- Open quiz with `?quizVariant=common_area_pests` and confirm pest step is skipped.
- Confirm progress count is 5 steps for `pest_selection` and 4 steps for `common_area_pests`.
- Confirm back navigation works and skips the pest step for `common_area_pests`.
- Confirm `localStorage.bugmdQuizVariant` persists the selected variant.
- Confirm changing the URL override updates the persisted variant.
- Confirm review page copy changes correctly.
- Confirm `pest_selection` summarizes selected pests or shows "General outdoor pest protection."
- Confirm `common_area_pests` does not show pest selection editing controls.
- Confirm checkout/cart still works for quarterly, annual, and one-time plans.
- Confirm cart/order metadata includes `Quiz variant` and `Experiment name`.
- Confirm tracking events include `quiz_variant`.
- Confirm `ExperimentViewed` fires once per quiz session.
- Confirm no raw ZIP or PII is sent in Meta tracking payloads.
