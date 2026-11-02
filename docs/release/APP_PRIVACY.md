# Rimba App Privacy declarations

Saved and published in App Store Connect after explicit owner approval on2026-11-01. Review this inventory again for the final binary; it is not an assertion of full release readiness.

## Final SDK reconciliation — 2 November 2026

Owner explicitly approved adding and publishing four categories on 2 November. Apple now shows **12 data types**, Published a few seconds ago, with no unfinished Set Up entries. Eight categories below remain; additions are:

| Data type | Purpose | Identity | Tracking | Evidence |
| --- | --- | --- | --- | --- |
| Coarse Location | App Functionality | Linked | No | Google Sign-In may derive general location from IP for fraud prevention |
| Device ID | Analytics | Linked | No | GoogleSignIn8.0 bundled privacy manifest |
| Other Usage Data | Analytics | Linked | No | GoogleSignIn8.0 bundled privacy manifest |
| Other Data Types | App Functionality, Analytics | Linked | No | GoogleSignIn8.0 bundled privacy manifest |

These are conservative disclosures of the bundled SDK declarations, not activation of new collection. The app requests only Google email/profile scopes; no phone scope, location permission, IDFA or Facebook login configuration is enabled. Google's general SDK manifest also lists phone number; no phone-number collection path is established for this configured app. Provider privacy manifests describe SDK capabilities and do not prove every field is transmitted on each login. No claim of packet-level verification is made.

Sources: [Google disclosure guide](https://developers.google.com/identity/sign-in/ios/app-privacy), [exact GoogleSignIn8.0 manifest](https://raw.githubusercontent.com/google/GoogleSignIn-iOS/8.0.0/GoogleSignIn/Sources/Resources/PrivacyInfo.xcprivacy), [RevenueCat Apple privacy guidance](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy). Evidence outside Git: `D:/Project/Rimba/Deliverables/Rimba-Build14-UI/privacy-published.png` and `.txt`. This label publication is not an App Review submission.

| Data type | Purpose | Identity | Tracking | Evidence |
| --- | --- | --- | --- | --- |
| Name | App Functionality | Linked | No | Auth and shared account profile |
| Email Address | App Functionality | Linked | No | Supabase Auth and server-only profile email |
| Photos or Videos | App Functionality | Linked | No | User-selected avatar uploads |
| Gameplay Content | App Functionality | Linked | No | Cloud sanctuary/island/object save |
| Other User Content | App Functionality | Linked | No | Profile bio, task notes, tags, to-dos in cloud save |
| User ID | App Functionality, Analytics | Linked | No | Supabase UID supplied to RevenueCat |
| Purchase History | App Functionality, Analytics | Linked | No | Store entitlement validation and RevenueCat dashboard |
| Product Interaction | App Functionality | Linked | No | Focus session/history and app progress in account save |

No ads, IDFA integration, separate app analytics integration or RevenueCat contact attributes are configured in the reviewed app source. The bundled Google SDK declares its own analytics categories as reconciled above. Do not infer a lack of health-data collection solely from the age questionnaire's wellness flag: that flag describes mindfulness/lifestyle content, while this privacy inventory describes transmitted data.

Sources checked:
- https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy
- https://developer.apple.com/app-store/app-privacy-details/

The public privacy policy is https://rimba-website.jagarimba-tetaplestari.workers.dev/privacy. Apple submissions still require final screenshots, a tested current binary and the remaining engineering/release gates in EXECUTION_LOG.md.

2026-11-02: Campfire reports, reasons, room evidence, blocks and moderation decisions add identity-linked Other User Content/User ID processing for App Functionality. Those categories cover these fields. Approved daily backend maintenance and deletion redaction are deployed; the corresponding public Website policy was published and verified on 2 November. Policy covers provider connection/IP, platform/device information and technical logs. Physical-device acceptance and final signed-binary inspection remain separate gates.
