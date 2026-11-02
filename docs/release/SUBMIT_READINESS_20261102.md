# Submit readiness — 2 November 2026

**Ready for the owner to click Submit for Review. No review has been submitted.** Submit is visibly enabled; the owner subsequently reported build15smoke acceptance "aman". Device model/OS unspecified; full-matrix coverage limits remain below.

## Final candidate and draft

- Runtime9b6548d08665a812746477e90f5f36880a958767; release6f74a1f724f7a4db5e2b62660cda7d03de7794d4. Only deploy runner/docs differ from the verified app source.
- NativeCI41445401653 SUCCESS:401tests/45files, typecheck,155prelaunch, production export, Swift widget tests and iPhone/iPad compilation. Fresh local build/typecheck/155prelaunch passed after the runner-only change.
- Both build14attempts/run41448458837 failed to acquire hosted ARM capacity before any step/upload. One deploy runs-on line changed to official standard macos-26-intel, not a paid larger runner.
- Deploy41453991325 SUCCESS, actual **1.0(15)**. Apple30f5b9e2-1a38-4c74-ab6a-e4623d8dac15 **VALID / IN_BETA_TESTING**, listed in Internal. Group automatically has all builds; manual assignment initially returned422, then automatic membership was verified. EN/ID beta notes saved; version1.0 selects15.
- Signed IPA/artifact13146986626: host+widget1.0(15),ARM64,families1/2,iOS16minimum,matching/unexpired distribution profiles,get-task-allow=false,correct shared AppGroup,18privacy manifests including both bundles. CI codesign/deep/widget verification passed. Evidence: build/ipa15-audit.json, copied to Deliverables.
- Draft41619189-27ab-4c80-83e3-2e07ef3e3bba has **5ready items**: iOS1.0(15),Rimba Pro group,annual,monthly,lifetime. API READY_FOR_REVIEW, every item READY_FOR_REVIEW, **submittedDate=null**. UI has no blocking validation message and final Submit enabled. Draft preparation is not submission.

## Listing, privacy, business and reviewer

- Owner iPhone video first+6frames,8iPad screens and header;46placements ACTIVE across EN/ID. All three IAP review screenshots COMPLETE with explicit browser-capture/unavailable-price provenance. They are not native purchase proof.
- App Privacy12categories published with explicit owner approval; no unfinished setup. GoogleSignIn8.0 additions/purposes recorded in APP_PRIVACY.md.
- Two bundled Facebook SDK manifests declare tracking capability at ep1.facebook.com. Rimba configures only Google email/profile; no FacebookAppID/client token,Facebook AppDelegate initialization or Facebook login path. Configuration/source evidence of an unused provider is not packet-level proof. Vendor manifests were not rewritten.
- Reviewer password login succeeded, expected identity, fictional cloud save readable and moderator=false. Apple stored credentials match; review contacts complete. No credentials in this ledger.
- Paid/Free agreements, configured bank account, tax forms and compliance Active; no business/legal settings changed. Age declaration userGeneratedContent=true,messagingAndChat=false,health/wellness=true; no ads/gambling/lootbox.

## Device and live-service evidence

- Owner reported13single-device guest-history isolation,Restore/Pro surviving relaunch and widget setup safe. Model/OS unspecified; no separate physical iPad result.
- Live Campfire: native host13+authenticated reviewer QA RPC participant,2-member lobby rev2,active rev3,15-minute Shared Destiny. Owner reported normal timer, then intentionally exited safely to sanctuary. Server severed rev4 before QA leave, which succeeded. Not a second native/browser UI, timed completion/reward or report/block/moderation action test. No fake reports or account deletion.
- Two separate Auth sessions on fictional reviewer tested production CAS with identical content:rev1→2,stale commit rejected,duplicate idempotent,progress unchanged. Not a two-physical-client conflict UI test.
- Owner asked to install15and verify audio sliders/mute,generated/custom names EN/ID,outline icons,focus start/pause/cancel and direct Campfire moderation/empty queue on support account. **Owner replied "aman".** No repurchase/deletion performed for this smoke. Do not infer unspecified device model/OS or full lifecycle scenarios.

Remaining coverage: two physical clients,physical iPad,full billing lifecycle,timed social rewards and report/block/moderation actions. DEVICE_ACCEPTANCE.md keeps coverage limits separate from owner-reported passes; do not mark the entire matrix passed.

## Evidence and next step

Proof: D:/Project/Rimba/Deliverables/Rimba-Build14-UI/apple-submit-enabled-build15.png,candidate15-verified.json,submit-draft15-verified.json,ipa15-audit.json,privacy-published.png plus reviewer/business booleans and live QA summaries. Folder name is historical; final candidate15.

Leave final Submit for Review to the owner; the page is prepared and owner15smoke passed as reported. Preparing the page does not authorize submitting it. Preserve the coverage limits rather than marking every pending historical scenario passed.
