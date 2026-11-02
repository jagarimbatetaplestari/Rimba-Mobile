# Final candidate device acceptance

Latest checkpoint, 2 November: final TestFlight **1.0(15)** runtime9b6548d/release6f74a1f is **VALID / IN_BETA_TESTING / Internal**, selected in draft. Deploy41453991325 SUCCESS using a standard Intel runner after both14attempts failed to acquire ARM capacity. NativeCI41445401653 passed401tests/45files and native verification; signed15IPA inspected. Apple draft has five ready items and Submit enabled, submittedDate=null. Owner replied **"aman"** to the15smoke covering audio,mute,names,icons,focus start/pause/cancel and direct moderation/empty queue. Model/OS unspecified; no separate iPad/full-matrix claim. See SUBMIT_READINESS_20261102.md.

Owner update, 2 November: asked specifically about build13 account→guest history isolation, Restore→Pro surviving app close/reopen, installed Home/Lock/Control widgets and two-device sync/Campfire; replied "aman kecuali campfire ... hanya ada satu device." Record single-device history isolation, Pro restore/relaunch and widget setup as owner-reported passed; device model/OS unspecified. Do not count two-device cloud synchronization as passed from a single-device report. Campfire was subsequently tested below. Final15audio/name/icon/moderation acceptance remains pending.

Subsequent live Campfire QA: owner created a15-minute Shared Destiny room in13. Authenticated reviewer QA client joined through the same public RPC contract; lobby revision2/two members and active revision3/both focusing observed. Owner reported timer normal, then intentionally left and confirmed return to sanctuary was safe. Server observed severed revision4 before QA left; QA leave succeeded. This verifies native host create/start/exit against a real second authenticated participant, **not** a second native/browser UI or timed completion/reward. Evidence: ignored `build/campfire-native-host-qa.json`, server poll output and owner replies. No report, block, moderation action, reward or account deletion performed.

Historical widget checkpoint: source408345b/build12 was superseded by final15above. Build8was the earlier Pro activation candidate; build5screenshots/runtime are older. Rows below describe the complete matrix; owner-reported passes are separated from untested scenarios and no physical iPad result is invented.

Owner evidence, 2 November2026: in response to the build12 Restore request, the owner reported successful Restore, then deleted the Rimba account, signed in again and successfully restored again. This confirms the reported Restore/recreated-account path. Device model, dual-sound-mixer access and Pro persistence after force-close/relaunch were not stated; do not mark the entire purchase/lifecycle or both-device rows passed. A new UI candidate `2bc609e` changes copy/layout/colors only; native verification/upload is in progress.

| Flow | Expected result | iPhone | iPad |
| --- | --- | --- | --- |
| Email registration / confirmation | Enter or paste all 8 OTP digits, then verify successfully | Pending | Pending |
| Password recovery | All 8 OTP digits fit; new password works | Pending | Pending |
| Apple / Google sign-in | Successful sign-in, cancellation returns to usable login screen | Pending | Pending |
| Account isolation | Apple account A → sign out → guest has no A history; sign back into A restores A | Owner reports13 safe, device unspecified | No separate iPad evidence |
| Focus | Repeat start, pause, resume, cancel; no recovery screen or blank page | Owner15smoke reports safe | No separate iPad evidence |
| Background timer | Background/foreground and force close preserve correct elapsed time, with one reward per completion | Pending | Pending |
| Profile / menus | Subscription, delete confirmation, dismiss, language switching all respond; no stuck overlays | Pending | Pending |
| Audio | Music/nature sliders change output; mute, next track, global audio toggle and restart retain correct silence/volume | Owner15audio/mute smoke reports safe; full background/restart matrix not separately stated | No separate iPad evidence |
| Language / icons | Generated island and biome names follow EN/ID; custom names stay intact; popup UI uses outline icons | Owner15smoke reports safe | No separate iPad evidence |
| Purchase / restore | Native prices appear; sandbox monthly/annual/lifetime grant verified Pro; restore works | Owner reports13 Restore/Pro relaunch safe; full three-plan matrix not established | No separate iPad evidence |
| Billing lifecycle | Cancel/pending/refund/expiry/renewal and account switch reflect server-verified rights | Pending | Pending |
| Home / Lock widgets | Add Rimba from system editors; real stats, empty history stays zero, correct language and layout | Owner reports13 widget setup safe; full edge matrix pending | No separate iPad evidence |
| Widget quick focus | Cold/warm launch starts a full25-minute session; existing session is opened without duplicates | Pending | Pending |
| Native countdown | Start/pause/resume/cancel updates widgets; paused timer does not tick; no old-account data after logout→guest | Pending | Pending |
| Control Center (iOS18+) | Add Rimba Focus from system editor; one tap opens app and starts preferred duration once after account/save readiness | Owner reports13 controls safe; full quick-focus edge matrix pending | No separate iPad evidence |
| Cloud sync | Two devices show same owner progress; concurrent edits produce explicit conflict choice without data loss | Pending | Pending |
| Campfire | Two signed-in accounts create/join/start/leave correctly; report/block work and guest is refused |13native host + QA RPC participant create/join/start/host exit passed; report/block device UI pending | No separate iPad evidence |
| Moderation | Owner support account is registered, role verified, report queue and action tested | Owner15entry/empty queue smoke reports safe; no moderation action performed | No separate iPad evidence |
| Account deletion | Use an explicitly disposable account: cancel first, then delete; Apple revocation succeeds and other accounts survive | Pending | Pending |

Capture a native Pro paywall screenshot with actual StoreKit offering/prices for purchase review. Never share passwords, OTPs, real purchase receipts or private account identifiers in the public release ledger.
