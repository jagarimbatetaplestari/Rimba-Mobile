# Paywall text and App Store purchase metadata — 2 November 2026

Owner request: eliminate subscription text ellipses and match flyout icons to the navbar's dark green.

- Shortened EN/ID paywall title and plan labels; preserved billing periods, price placeholders, legal text and purchase/Restore guards.
- Replaced paywall truncation with wrapping, allowed legal links to wrap, stacked pricing cards below 360px and kept scroll content from shrinking.
- Flyout icon tiles use `#0b2719` with pale green backgrounds in both themes; menu labels wrap instead of hiding their endings.
- Reproduced clipping before the change at widths320/375/402. Final EN/ID matrix320/375/402/440/768 (10cases) has no paywall/flyout ellipsis or horizontal paywall text overflow; all menu icons match `rgb(11,39,25)`. Evidence and screenshots are in ignored `build/paywall-layout/`.
- 365 tests/40files, typecheck,155prelaunch assertions and production static export passed. A focused external review found no actionable issue in the three-file diff; billing/auth behavior unchanged.

Apple metadata inspection found all three product localizations and review notes present, but each review screenshot absent; products were MISSING_METADATA. Review screenshots/status will be verified through Apple API. Screenshot UI captures are browser renders; they do not prove native StoreKit prices or successful purchases. Physical-device Restore/Pro acceptance remains open.

No App Review submission. Native candidate/upload status is recorded in the handoff after verification.
