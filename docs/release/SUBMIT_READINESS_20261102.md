# Submit readiness — 2 November 2026

Status: **NOT ready to Submit**. No submission was sent. Remaining gates are specific below; a green source/simulator check is not physical-device acceptance.

## Verified

- Runtime `9b6548d08665a812746477e90f5f36880a958767`, documentation/source checkout `c229c207493d97fb183bc7b4a2a8343ca61dd7bd`.
- NativeCI [41445401653](https://github.com/jagarimbatetaplestari/Rimba-Mobile/actions/runs/41445401653) SUCCESS:401tests/45files, typecheck,155prelaunch, static production build, Swift widget tests and iPhone/iPad simulator compilation.
- Artifact13143211438 (verification25) downloaded through the GitHub connector and inspected. Host `com.syntheticae.rimba` and embedded `com.syntheticae.rimba.widgets`, both families1/2, iOS16 minimum;18privacy manifests including host and widget. Simulator build number1 is expected and is not TestFlight14. Local audit JSON: ignored `build/native25-privacy-audit.json`.
- GoogleSignIn8.0 declaration reconciled to Apple label. With explicit owner approval, four additional categories published; Apple displays12categories and no unfinished setup. See APP_PRIVACY.md.
- Two Facebook SDK privacy manifests declare tracking capabilities (`ep1.facebook.com`). They arrive through the monolithic social-login plugin. Rimba configures only Google email/profile, has no FacebookAppID/client token, no Facebook AppDelegate initialization and no Facebook login path. This is configuration/source evidence of an unused provider, not a packet capture or proof that the manifest itself declares no tracking. Do not rewrite vendor manifests to hide declarations.
- Reviewer account password login succeeded against production Auth, correct identity, fictional cloud save readable at revision1, moderator=false. Stored Apple username/password match, review contact fields complete. No credentials are logged in this document.
- Owner iPhone video first +6frames,8iPad screens and header;46placements ACTIVE across EN/ID. Three Pro review screenshots COMPLETE, with browser-capture provenance explicitly disclosed. Actual native-price screenshot still desirable/awaited.
- All three products had READY_TO_SUBMIT before being added to review draft. Draft now contains group Rimba Pro, annual, monthly and lifetime (4items). `submittedDate=null`. Preparing the draft is not Submit for Review.

## Remaining

1. Upload14/run [41448458837](https://github.com/jagarimbatetaplestari/Rimba-Mobile/actions/runs/41448458837), checkout c229c20/runtime9b6548d. BOTH attempts failed before any step: hosted runner not acquired; annotations cite macOS arm64 capacity constraints. Targeted recovery changes only deploy `runs-on` to standard `macos-26-intel`, officially documented with Xcode26.6/iOSSDK26.5. No paid larger runner or runtime change. Next deploy expected15; verify actual number. Do not count14as uploaded.
2. Once upload succeeds, inspect signed IPA/AppGroup/code-sign verification, wait for Apple14VALID, assign Internal, save EN/ID beta notes and select14 in version1.0. Existing13VALID/Internal is the older UI candidate without current audio/name/icon/direct-moderation fixes. Prepared ignored helper `build/asc-candidate14.mjs` refuses to select a missing/non-VALID build.
3. Add app version1.0 with final14 to the **same** draft `41619189-27ab-4c80-83e3-2e07ef3e3bba`. Apple currently disables Submit because no app version is included. Include any creative assets Apple asks to review; verify all validation messages and save a final screenshot. Never click final Submit.
4. Owner device acceptance: current audio/mute on iOS, generated/custom names EN/ID, monochrome popups, support moderator direct Campfire entry/empty queue; core account isolation/focus/Pro persistence; actual Home/Lock/control widgets and two-device sync/Campfire. DEVICE_ACCEPTANCE.md records pending rows honestly. Earlier Restore/recreated-account success is partial evidence, not all-device/lifecycle completion.
5. Final App Review reviewability check and handoff. Keep product/browser/simulator/device evidence separate. No "ready" claim while these gates remain open.

Owner update: build13 account→guest isolation, Restore/Pro relaunch and widget setup reported safe on one device, model/OS unspecified. Live Campfire test then used native host13 and authenticated reviewer QA RPC participant: two-member lobby revision2, active revision3 and normal15-minute timer reported by owner. Owner intentionally exited safely to sanctuary; server severed revision4 before QA leave (which succeeded). This is not a second native/browser UI, full timed completion/reward or report/block/moderation device test. Two-device cloud and final-candidate audio/name/icon/moderation remain open.

Public evidence: `D:/Project/Rimba/Deliverables/Rimba-Build14-UI/privacy-published.png`, `review-draft-products.png`; account verification JSON omits private identity/credentials. Product screenshot captures show unavailable browser prices and must not be described as native purchase proof.
