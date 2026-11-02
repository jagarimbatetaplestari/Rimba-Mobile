# Final candidate device acceptance

Candidate source: `a1ea4f6bb18591ff1e1a66dad013bb41c87c5de9`. Native widget candidate TestFlight 1.0 (11) is being uploaded in run41403770011; verify Apple VALID/Internal availability before installing. Build8 was the previous Pro activation candidate; build5 screenshots/runtime are older. Record the exact installed build and separate iPhone/iPad results. All rows remain unverified until device testing.

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
| Home / Lock widgets | Add Rimba from system editors; real stats, empty history stays zero, correct language and layout | Pending | Pending |
| Widget quick focus | Cold/warm launch starts a full25-minute session; existing session is opened without duplicates | Pending | Pending |
| Native countdown | Start/pause/resume/cancel updates widgets; paused timer does not tick; no old-account data after logout→guest | Pending | Pending |
| Control Center (iOS18+) | Add Rimba Focus from system editor; one tap opens app and starts preferred duration once after account/save readiness | Pending | Pending |
| Cloud sync | Two devices show same owner progress; concurrent edits produce explicit conflict choice without data loss | Pending | Pending |
| Campfire | Two signed-in accounts create/join/start/leave correctly; report/block work and guest is refused | Pending | Pending |
| Moderation | Owner support account is registered, role verified, report queue and action tested | Pending | Pending |
| Account deletion | Use an explicitly disposable account: cancel first, then delete; Apple revocation succeeds and other accounts survive | Pending | Pending |

Capture a native Pro paywall screenshot with actual StoreKit offering/prices for purchase review. Never share passwords, OTPs, real purchase receipts or private account identifiers in the public release ledger.
