# Release Blockers

Apple setup last verified: **October 6, 2026**. Google statuses below remain
from **September 7, 2026**; Google was not reinspected during the Apple setup.

App identifier: `com.rileymathews.papyrd`.

The app will remain **completely free, with no in-app purchases**. Paid-app
agreements, banking, payment-related tax setup, and in-app purchase configuration
are not required for this release plan.

These checklists contain confirmed missing setup and the remaining release tasks.
No releases were submitted or published during inspection. Final submission
validation may reveal additional build-specific requirements; completing this
list does not guarantee store approval.

**Start Google tester recruitment first.** Its qualifying test and production-access
approval are external dependencies. Complete Apple's setup in parallel.

## Google Play

### Current State

| Item | Verified status |
| --- | --- |
| Production | Inactive; production access locked |
| Production application | Apply for production disabled |
| Qualifying closed testers | 0 currently opted in; 12 required |
| Qualifying test duration | At least 12 testers opted in for 14 consecutive days |
| Available closed release | `0.0.8`, version code `23` |
| Newer closed draft | `0.0.11`, version code `30` |
| Tester list | `internal testers`, containing 2 users |
| Closed-test availability | 177 countries/regions |
| Managed publishing | Off |
| Publishing overview | No unpublished changes shown |
| Pricing | Free |
| Policy status | No issues found |
| App content | No declarations needing attention |
| Default listing | Live for the current testing distribution, not public production |

Version codes were confirmed by the earlier API inspection. The console confirmed
the release names and states. Being listed as a permitted tester is not the same
as opting in: the eligibility dashboard reports **zero opted-in testers**.

### Required Checklist, In Recommended Order

- [ ] **1. Recruit at least 12 closed testers.** Expand the permitted email list or configure a Google Group. The current two-user list is insufficient.
- [ ] **2. Have testers explicitly opt in.** Share the closed-test opt-in link and ensure they join with eligible Google accounts, install the app, and genuinely test it.
- [ ] **3. Run the qualifying closed test.** Maintain at least 12 opted-in testers for 14 consecutive days. Collect feedback and document engagement, defects, and improvements.
- [ ] **4. Prepare the production-access application.** Document recruitment, tester engagement, feedback, changes made, intended audience, and why the app is production-ready.
- [ ] **5. Apply for production access.** Submit when the dashboard enables the application, then obtain Google's approval. Additional testing may be requested.
- [ ] **6. Verify the production candidate and existing declarations.** Confirm the sign-in/reviewer access, privacy policy, Data safety answers, content ratings, and other declarations remain accurate for the build being released.
- [ ] **7. Configure the production release.** After access is unlocked, choose production countries/regions, select or upload the tested candidate, provide release notes, and resolve release-validation errors. Production setup could not be fully inspected while access was locked.
- [ ] **8. Verify CI production permissions.** Confirm the Google service account can release this app to production. Successful API reads and testing uploads do not prove production-release permission.
- [ ] **9. Implement and verify the production Fastlane lane.** Use `track: "production"`, `release_status: "completed"`, and no staged-rollout fraction. Use `changes_not_sent_for_review: false`; consider `rescue_changes_not_sent_for_review: false` so a manual-submission requirement fails visibly rather than appearing successful.
- [ ] **10. Submit for review and full rollout.** Keep Managed publishing off so approved changes publish automatically. Confirm the resulting production release is actually live, not merely uploaded or submitted.

The existing `0.0.8` release already satisfies the published-closed-release
prerequisite. Publishing `0.0.11` specifically is not required for eligibility.
However, using a current, representative candidate for the qualifying test is
recommended.

### Already Completed

- [x] Publish a closed-testing release.
- [x] Configure free pricing.
- [x] Configure a default store listing, category, and contact information.
- [x] Complete the currently requested app-content declarations: sign-in details, Advertising ID, health apps, financial features, government apps, Data safety, target audience/content, content ratings, ads, and privacy policy.
- [x] Clear currently reported policy issues: the policy page reports none.
- [x] Register apps for Android developer verification, as reported by the account homepage.
- [x] Turn Managed publishing off for automatic publication after approval.

### Recommended Improvements, Not Confirmed Blockers

- [ ] Add a feedback URL or email to the closed-test configuration; it is empty.
- [ ] Address or assess the deprecated edge-to-edge API warning.
- [ ] Test tablet/foldable layouts and assess the orientation/resizability warning.

**Conflicting console recommendation:** Google displayed an outdated-closed-track
recommendation claiming a production release superseded it. This conflicts with
the locked Production page, inactive dashboard, and empty production API track.
Do not pause the closed track based on that recommendation; it is needed for
production eligibility.

### Console Links

- [Dashboard and production eligibility](https://play.google.com/console/u/0/developers/5317667053007284234/app/4976094516656878243/app-dashboard)
- [Closed-test testers](https://play.google.com/console/u/0/developers/5317667053007284234/app/4976094516656878243/tracks/4698835599345728353?tab=testers)
- [Publishing overview](https://play.google.com/console/u/0/developers/5317667053007284234/app/4976094516656878243/publishing)
- [App content](https://play.google.com/console/u/0/developers/5317667053007284234/app/4976094516656878243/app-content/overview)

## Apple App Store

### Current State

| Item | Verified status |
| --- | --- |
| App Store app ID | `6763586382` |
| Public version | `1.0.0`, Prepare for Submission |
| App Review | No submitted items |
| Latest TestFlight build | `0.0.18 (1)`, Testing, internal and external groups |
| Build attached to public version | None |
| Release setting | Automatically release this version |
| Free Apps Agreement | Active, September 7, 2026 through April 23, 2027 |
| Updated developer license warning | Resolved after Account Holder acceptance |
| Pricing and availability | Free; 174 regions selected (China mainland excluded for permits/ICP requirements) |
| App Privacy disclosures | Published October 6, 2026: Data Not Collected |
| DSA compliance | Active; Account Holder declared non-trader October 6, 2026 |
| Primary category | Books |
| Age rating | 4+ globally, with regional exceptions; not Made for Kids |

TestFlight approval does not replace public App Store review. The existing public
draft version and latest uploaded build have different marketing versions.

### Required Checklist, In Recommended Order

- [x] **1. Choose launch territories and resolve EU status if applicable.** Account Holder completed non-trader DSA declaration; Business reports Active. Launch in all regions except China mainland, which requires ICP/publication permits for Books apps. Availability includes EU regions.
- [x] **2. Choose the first public marketing version.** `1.0.0` saved in the public draft and set as Expo's default; candidate workflow explicitly uses the same version. Existing `0.0.18` builds are not attached.
- [ ] **3. Prepare reliable reviewer access.** Provide a working demo server with legally distributable books, credentials if needed, and clear setup instructions. Reviewers should not need to deploy their own server to evaluate core functionality.
- [ ] **4. Provide a public privacy policy URL.** The App Privacy URL is unset. Ensure the policy accurately describes user-provided server connections and any developer/SDK data collection.
- [x] **5. Complete and publish App Privacy disclosures.** Published Data Not Collected after checking app dependencies/network behavior: no developer analytics/tracking SDKs; OPDS/KOSync requests go directly to user-selected services, not developer collection. See `docs/privacy-policy.md` for server-side caveats.
- [x] **6. Select the primary app category.** Books; subtitle: Your self-hosted ebook reader.
- [x] **7. Complete Content Rights Information.** Declared access to legally permitted third-party content. No hosted/bundled commercial library; reviewer/demo content must also be legally distributable.
- [x] **8. Complete the age-rating questionnaire.** Calculated global 4+ with regional exceptions. No general web browser, social/UGC distribution, chat, ads, gambling, or app-provided mature content; personal server libraries are user-selected, not curated by Papyrd. Not Made for Kids.
- [x] **9. Provide the app description.** Saved self-hosted OPDS library, offline reading, optional KOSync, free/open-source description; explains a compatible catalog is needed and no hosted library is provided.
- [x] **10. Provide search keywords.** Saved ebook/EPUB/reader/OPDS/KOSync/self-hosted/offline/library keywords.
- [ ] **11. Provide a public support URL.** Currently empty; provide a support page with a way to contact you.
- [x] **12. Provide copyright information.** Saved `2026 Riley Mathews`.
- [ ] **13. Upload iPhone screenshots.** Currently zero. The displayed 6.5-inch slot accepts portrait `1242 x 2688` or `1284 x 2778`, or their landscape equivalents.
- [ ] **14. Upload iPad screenshots.** Required for the supported iPad device family; currently zero. The displayed 13-inch slot accepts portrait `2064 x 2752` or `2048 x 2732`, or their landscape equivalents.
- [ ] **15. Fill App Review contact information.** First name, last name, phone number, and email are empty.
- [ ] **16. Fill App Review sign-in information and instructions.** Sign-in required is checked, but username/password and Notes are empty. Supply the reviewer access prepared above, or correct the sign-in requirement if it genuinely does not apply.
- [x] **17. Set an explicit free price.** Set US base price to $0.00 and comparable free prices in all 175 regions. Paid Apps Agreement is not needed.
- [x] **18. Configure country/region availability.** Public App Store distribution; all regions except China mainland selected. Future-region availability enabled. These are available on release, not live yet.
- [ ] **19. Upload and attach the matching release build.** Wait for processing and resolve any build-specific compliance errors. Verify the existing non-exempt-encryption declaration remains accurate; separate documentation is only needed if the actual encryption usage requires it.
- [ ] **20. Implement and verify the production Fastlane lane.** Implemented exact-build `upload_to_app_store` submission with `submit_for_review: true`, `automatic_release: true`, and `phased_release: false`; local helper tests pass. Still requires a real CI submission to verify API-key permissions. See `docs/apple-release.md`.
- [ ] **21. Run final submission validation and submit for App Review.** Resolve any additional requirements surfaced once the metadata and build are complete. Keep automatic release selected and confirm public availability after approval.

### Already Completed

- [x] Accept the updated developer license; the blocking notice is gone.
- [x] Activate the Free Apps Agreement, confirmed through April 23, 2027.
- [x] Create the app record and configure its bundle identifier and primary language.
- [x] Upload and distribute builds through internal and external TestFlight testing.
- [x] Select automatic release after App Review approval for the current public draft.
- [x] Use Apple's Standard License Agreement; no custom EULA is required.

### Optional Or Out Of Scope

- Promotional text, subtitle, marketing URL, and app preview videos are optional.
- Accessibility labels are not configured; they are a recommended product-page improvement, not a confirmed submission blocker.
- Paid Apps Agreement, payment banking/tax setup, and paid-app legal-entity setup are out of scope.
- In-app purchases, subscriptions, purchase notifications, and shared secrets are out of scope.
- An empty encryption-documentation upload area is not itself a blocker if the app qualifies for the existing exemption declaration.

### Console Links

- [Business and agreements](https://appstoreconnect.apple.com/business)
- [Version details, screenshots, build, and reviewer information](https://appstoreconnect.apple.com/apps/6763586382/distribution/ios/version/inflight)
- [App Information, category, age ratings, and content rights](https://appstoreconnect.apple.com/apps/6763586382/distribution/info)
- [App Privacy](https://appstoreconnect.apple.com/apps/6763586382/distribution/privacy)
- [Pricing and Availability](https://appstoreconnect.apple.com/apps/6763586382/distribution/pricing)

## CI Release Safeguards

Apply these before enabling automatic production submission on release tags:

- [x] Validate release tags as store-compatible marketing versions. Numeric major.minor.patch only; validation runs before signing/build/upload, with regression tests.
- [x] Serialize release submissions per platform to avoid build-number collisions and competing submissions. Per-platform concurrency groups; do not push several tags at once (GitHub pending runs are not a durable FIFO queue).
- [x] Make Android version-code lookup failures fail safely instead of falling back to version code `1`. Track API errors now propagate; covered by regression test.
- [ ] Make retries resume known uploads/submissions rather than blindly uploading another build.
- [ ] Switch release-tag jobs to the verified production lanes. Android remains closed testing. iOS has production and exact-build submit lanes, but tags remain internal until repository variable `IOS_PRODUCTION_READY=true` is enabled after real submission verification.
- [x] Report uploaded, submitted, approved, and live as distinct states. Lane logs and workflow summaries distinguish TestFlight upload/public submission; approval and live status require separate console checks.

The target workflow is **release tag -> build -> upload -> submit for review ->
automatic full release after approval**. Neither store's review can be bypassed.
