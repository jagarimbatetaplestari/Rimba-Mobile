# Final candidate device acceptance

Candidate source: `f64367307a1211004eaf757f118d4f77315a08de`. TestFlight 1.0 (5) is VALID and available to the Internal group, uploaded from 308215b (runtime unchanged from f643673). Previous build 4 does not contain these fixes. Record results separately for iPhone and iPad; all rows remain unverified until tested on that build.

| Flow | Expected result | iPhone | iPad |
| --- | --- | --- | --- |
| Email registration / confirmation | Enter or paste all 8 OTP digits, then verify successfully | Pending | Pending |
| Password recovery | All 8 OTP digits fit; new password works | Pending | Pending |
| Apple / Google sign-in | Successful sign-in, cancellation returns to usable login screen | Pending | Pending |
| Account isolation | Apple account A → sign out → guest has no A history; sign back into A restores A | Pending | Pending |
| Focus | Repeat start, pause, resume, cancel; no recovery screen or blank page | Pending | Pending |
| Background timer | Background/foreground and force close preserve correct elapsed time, with one reward per completion | Pending | Pending |
| Profile / menus | Subscription, delete confirmation, dismiss, language switching all respond; no stuck overlays | Pending | Pending |
| Purchase / restore | Native prices appear; sandbox monthly/annual/lifetime grant verified Pro; restore works | Pending | Pending |
| Billing lifecycle | Cancel/pending/refund/expiry/renewal and account switch reflect server-verified rights | Pending | Pending |
| Cloud sync | Two devices show same owner progress; concurrent edits produce explicit conflict choice without data loss | Pending | Pending |
| Campfire | Two signed-in accounts create/join/start/leave correctly; report/block work and guest is refused | Pending | Pending |
| Moderation | Owner support account is registered, role verified, report queue and action tested | Pending | Pending |
| Account deletion | Use an explicitly disposable account: cancel first, then delete; Apple revocation succeeds and other accounts survive | Pending | Pending |

Capture a native Pro paywall screenshot with actual StoreKit offering/prices for purchase review. Never share passwords, OTPs, real purchase receipts or private account identifiers in the public release ledger.
