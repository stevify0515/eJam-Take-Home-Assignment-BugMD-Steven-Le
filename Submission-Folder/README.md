# BugMD Pest Defense Pro Funnel Submission

Live storefront: https://wybmic-ua.myshopify.com

The storefront is public. Shopify staff/admin access is handled separately through the staff invite requested in the assignment.

## Contents

- `BugMD_Pest_Defense_Pro_Funnel_Submission.docx` - concise process and evidence summary.
- `Playwright Tests/` - automated funnel test script, config, package file, and test explanation.
- `Facebook Pixels/` - Meta Pixel verification screenshots.
- `PageSpeed Insights/` - downloaded PageSpeed reports for landing, product/offer, and quiz pages on mobile and desktop.
- `Mobile and Desktop Screenshots/` - iOS, Android, and desktop QA screenshots.
- `AB Testing/` - control and variant screenshots plus A/B testing implementation notes.
- `Shopify-Product-Setup.png` - product/admin setup evidence.

## Review Notes

The Playwright tests verify the live cart contract: plan selection, quiz completion, correct SKU, price, selling plan behavior, and cart metadata. They can be run against the public storefront with:

```sh
cd "Playwright Tests"
npm install
BASE_URL=https://wybmic-ua.myshopify.com npx playwright test
```
