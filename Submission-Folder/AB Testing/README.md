# A/B Testing Implementation

I added a lightweight quiz experiment named `pest_step_variant` for the BugMD Pest Defense Pro funnel.

## Variants

- `pest_selection` - control experience. The quiz asks shoppers to select specific pests after home size.
- `common_area_pests` - variant experience. The quiz skips the pest selection step and frames the plan around common seasonal pests in the shopper's area.

## How Assignment Works

The experiment is controlled in theme JavaScript so the same Shopify page can serve both variants without duplicating templates.

1. A URL override can force a variant for QA: `?quizVariant=pest_selection` or `?quizVariant=common_area_pests`.
2. If no URL override exists, the script checks `localStorage.bugmdQuizVariant`.
3. If there is no stored value, it assigns a 50/50 browser-level variant and persists it.

## Why I Built It This Way

This was the fastest clean MVP for a Shopify theme assignment. It proves CRO experimentation thinking without requiring a third-party experimentation platform, backend bucketing, or duplicate Shopify pages. It also keeps QA deterministic because reviewers can force either variant from the URL.

## Tracking

The funnel emits `ExperimentViewed` once per quiz session and includes `quiz_variant` on the relevant funnel events. The Meta Pixel forwarding keeps the payload privacy-safe by sending values like `quiz_variant`, `selected_plan`, `step_name`, and `pest_count` instead of raw ZIP or other PII.

## Evidence

- `Control-Pest-Selection-Version.png`
- `Variant-Common-Pests-Version.png`
