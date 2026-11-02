# Paywall text and App Store purchase metadata — 2 November 2026

Owner request: eliminate subscription text ellipses and match flyout icons to the navbar's dark green.

- Shortened EN/ID paywall title and plan labels; preserved billing periods, price placeholders, legal text and purchase/Restore guards.
- Replaced paywall truncation with wrapping, allowed legal links to wrap, stacked pricing cards below 360px and kept scroll content from shrinking.
- Flyout icon tiles use `#0b2719` with pale green backgrounds in both themes; menu labels wrap instead of hiding their endings.
- Reproduced clipping before the change at widths320/375/402. Final EN/ID matrix320/375/402/440/768 (10cases) has no paywall/flyout ellipsis or horizontal paywall text overflow; all menu icons match `rgb(11,39,25)`. Evidence and screenshots are in ignored `build/paywall-layout/`.
- 365 tests/40files, typecheck,155prelaunch assertions and production static export passed. A focused external review found no actionable issue in the three-file diff; billing/auth behavior unchanged.

Apple metadata inspection found all three product localizations and review notes present, but each review screenshot absent; products were MISSING_METADATA. Three plan-specific review screenshots were uploaded, each delivery COMPLETE; monthly, annual and lifetime now READY_TO_SUBMIT. Screenshot UI captures are browser renders with price unavailable; review notes disclose this explicitly. They do not prove native StoreKit prices or successful purchases.

Owner reported successful Restore on build12, then account deletion/sign-in and another successful Restore. Device model, mixer and restart persistence were not separately stated. Support account was provisioned via dashboard with Auto confirm OFF and a private random bootstrap password; no password or invitation was sent. On the owner's subsequent recheck request, exact support email was confirmed and signed in. Campfire moderator membership was assigned only to that account. Authenticated RPC checks: support status=true, queue accessible (array), reviewer status=false. Actual in-app queue acceptance is requested and pending.

Native CI41437204766 and signed deploy41438719466/build13 passed. Apple buildUpload `ebb42a1c-c1a3-401a-927a-a57475d789c5` is COMPLETE with no errors/warnings; build13 is still awaiting appearance/VALID in the builds endpoint. Do not claim device availability yet.

No App Review submission. Native candidate/upload status is recorded in the handoff after verification.
