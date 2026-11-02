# Rimba App Privacy declarations

Saved and published in App Store Connect after explicit owner approval on2026-11-01. Review this inventory again for the final binary; it is not an assertion of full release readiness.

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

No ads, IDFA integration, external analytics SDK or RevenueCat contact attributes are configured in the reviewed app source. Dependency/native SDK behavior remains part of the final audit. Do not infer a lack of health-data collection solely from the age questionnaire's wellness flag: that flag describes mindfulness/lifestyle content, while this privacy inventory describes transmitted data.

Sources checked:
- https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy
- https://developer.apple.com/app-store/app-privacy-details/

The public privacy policy is https://rimba-website.jagarimba-tetaplestari.workers.dev/privacy. Apple submissions still require final screenshots, a tested current binary and the remaining engineering/release gates in EXECUTION_LOG.md.

2026-11-02 candidate: Campfire reports, reasons, room evidence, blocks and moderation decisions add identity-linked Other User Content/User ID processing for App Functionality. Existing selected categories appear to cover these fields, but final declaration must be audited against the deployed binary. Mobile policy source/static candidate updated with private moderator access, deletion redaction and90day moderation retention. Do not publish candidate policy before daily backend maintenance and deletion trigger deployment are verified. Public website policy still requires corresponding publication.
