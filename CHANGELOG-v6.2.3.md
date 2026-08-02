# Mangalsaath v6.2.3 — Sprint-1 Offer & Coupon Sync

## Completed
- Homepage offers are automatically approved and activated when an administrator saves them.
- Homepage offer discount details now resolve from the linked active coupon, creating one source of truth.
- Membership coupon banner, coupon copy action, pricing calculation and payment submission use the current dynamic coupon code.
- Active coupon filtering now respects activation and validity dates before public display.
- Added coupon and offer date validation, positive discount validation and duplicate-code protection.
- Added priority/expiry-aware offer selection through a shared offer service.
- Moved the homepage offer strip below the hero image so the couple photograph is never covered.
- Removed manual offer approval/status controls from the Admin Console.

## Admin workflow
1. Create or edit a coupon.
2. Create or edit a homepage offer and select the same coupon code.
3. Save the offer. It becomes approved and active automatically.
4. Homepage and Membership display the linked coupon values after refresh.
