# SSC Compass

Source: https://github.com/aurorasoftware-labs/sscsountdown

A dependency-free, mobile-first Maharashtra SSC study PWA. `dist/` is the complete deployable app; no build or paid API is required. Starts with 128 editable lesson/skill units and no fictional progress or marks.

## Open locally

Install Python 3, open a terminal in this folder and run:

```sh
python -m http.server 4173 --directory dist
```

Open http://localhost:4173. Do not open index.html directly: ES modules and the service worker need an HTTP origin. Run calculation tests with Node 20+ using `npm test` (no npm install needed).

## Put it on her phone

Upload the **contents of dist** to a static HTTPS host, for example Cloudflare Pages direct upload or Netlify manual deploy. No build command; publish directory `dist` if deploying from a repository. Check the host's current free-tier terms. Any HTTPS static host works. Use a dedicated root origin (the manifest and app identity assume a root deployment).

Visit once online. Android Chrome: menu → Install app. iPhone Safari: Share → Add to Home Screen. Offline data lives in browser storage, which may be cleared by browser settings or the operating system; export regular backups. Private browsing is unsuitable for durable storage.

The supplied Sites publication is owner-private by default. To give a student independent phone access, deploy `dist` on your own HTTPS host, or deliberately configure the site's audience through Sites. Firebase accounts remain separate from hosting access.

## Connect your Firebase project (cloud sync)

1. In [Firebase Console](https://console.firebase.google.com/) create or choose a dedicated project. No project has been invented or connected automatically. Check the current Spark/free-plan quotas before deployment; this app needs no Cloud Functions, Admin SDK or billing-only service.
2. Register a **Web app**. Copy its public `projectId` and `apiKey`. These are web-app identifiers, not private credentials. Never put a service-account JSON, private key or admin credential in the app or repository.
3. Enable **Authentication → Sign-in method → Email/Password**. Set an appropriate password policy; signup must satisfy the project policy. Password reset uses Firebase's email templates. Add the eventual app domain to the appropriate Firebase Auth authorized-domain settings.
4. Create **Cloud Firestore**, Standard/native mode, the **(default)** database. Start in production mode. Choose its location deliberately; it cannot simply be changed later. Deploy the supplied `firestore.rules`. Do not use open test-mode rules.
5. In the app open Settings → Take your progress anywhere, save the Firebase project ID and web API key, then create an account or sign in. Use the same project and email/password on all devices.
6. To preconfigure all devices, edit `dist/firebase-config.js` to export `{ projectId: 'actual-project-id', apiKey: 'actual-web-api-key' }` instead of null, then redeploy. A device's explicitly saved connection takes precedence over this default.
7. Device-only progress remains separate from signed-in progress. After signing in use **Copy device-only plan into account** if desired. Export both copies before replacement. Local data from the earlier backend is not deleted; export it from that version if it needs migration. Firebase accounts are separate accounts.

### Deploy to Firebase Hosting

Install the official Firebase CLI using the official guide. From this repository:

```sh
npx firebase-tools login
npx firebase-tools deploy --project YOUR_ACTUAL_PROJECT_ID --only firestore:rules,hosting
```

The tracked `firebase.json` publishes `dist/`, deploys the owner-only rules, and avoids stale caching of the service worker. No project ID is guessed or baked into `.firebaserc`. Firebase Hosting provides the live HTTPS address after a successful deployment. Never claim the example project ID is a connected project.

### Sync, conflicts and security

Firebase Auth REST sends credentials directly to Google's HTTPS endpoint; the app never stores passwords. ID/refresh tokens stay in localStorage so sign-in survives a restart. Use a trusted device; sign out on shared devices. Sign-out clears this app's local session, not all Firebase sessions on other devices.

Each Firebase UID owns exactly one `/study_state/{uid}` Firestore document. Rules deny other users, unauthenticated reads, collection listing and deletion. Only a valid schema with a monotonically incremented version and server timestamp can be written. A Firebase ID token is used for each request, so Firestore Security Rules apply. No service-account token is used.

The JSON payload is capped at **700 KB of UTF-8 data**, below Firestore's document-size limit. Export and prune old records if it grows beyond that. Backups can still be larger; cloud writes will pause with a clear message instead of silently discarding records.

Sync checks after edits, on returning online/visible, and every minute while open. Firestore commit preconditions use the last observed document update timestamp; first saves require the document not to exist. Stale or conflicting saves pause rather than overwrite. Resolve them explicitly in Settings after exporting a backup. Whole-plan replacement is supported; automatic field merging is not.

A dedicated service worker caches only same-origin app resources, never Firebase traffic. Local records are namespaced by Firebase project and UID to prevent accidental mixing across projects. No analytics or third-party scripts are loaded.

### Verify before relying on cloud sync

The dependency-free unit suite mocks Firebase HTTP responses; it checks token refresh, owner document paths, commit preconditions, permissions, conflicts, signup/signin, reset requests and size limits. It does **not** prove deployed rules or real authentication work.

For real integration testing, use two test accounts on the configured project. User B must not read/write user A's plan. Verify offline edits sync after reconnecting and simultaneous edits show a conflict. An optional emulator suite is included:

```sh
npx firebase-tools emulators:exec --project demo-ssc-compass --only auth,firestore "npm run test:rules"
```

The Firebase emulator requires a supported Java runtime; see current official requirements. These tests only target localhost and a demo project. No production database is cleared. Emulator and deployed-project integration results must be reported separately from unit-test results.

## How to use

- **Lessons:** rename placeholders, adjust the subject/book/minutes/priority, add or delete units. Stages: Not started, Learning, Practising, Revising, Mastered. First-pass coverage begins at Practising; weighted syllabus progress uses 0/25/55/80/100%, which is a planning convention, not evidence of exam mastery.
- **My plan:** edit daily and weekly goals and override any date. These are independent goals. The daily base remains fixed until explicitly edited. Missed new-lesson units carry forward as a separate backlog; extra completions reduce that backlog. Changing the base preserves past daily targets. First-pass completion switches the dashboard to revision mode. Early-finish goals default to 7 days before prelims (3 Dec 2026) and 14 days before boards (1 Feb 2027), with editable buffers; a goal is not a promise that the selected pace can reach it. Review dates start one day after reaching Practising, then 3/7/14/30 days after successive reviews. A review does not automatically mark mastery. Regressing below Practising clears its coverage/revision history.
- **Scores:** give each exam round a unique set name. Enter one combined total for each of six subjects: English, Hindi, other language, Maths, Science, Social Science. For example Maths 32/40 + 30/40 = 62/80; add internals only if actually known. The app supports variable maximum marks and averages normalized subject percentages with equal weight. Enter all six before calculating all-six or best-five; the latter excludes the lowest percentage. No pass/fail or official certification is inferred.
- **Insights:** pace uses newly covered units over up to 14 calendar days since plan creation, including rest days. It needs at least three days and two completions. Score ranges use recent actual results, dampened trend and an optional coverage penalty. Expand the methodology for details. These are heuristic scenarios, not validated prediction intervals.
- **Reminders:** calendar export creates 4:30 pm floating local-time blocks for unfinished future tasks with 15-minute alarms. Adjust them in your calendar. Test notification requires browser permission. No background push service, scheduled browser notification or always-running timer is included.
- **Backup:** Settings → Export; JSON restore validates the file and explicitly replaces the active plan. Keep copies when switching accounts or resolving conflicts.

## Syllabus / sources / uncertainties (checked 6 November 2026)

- CapCompass's accessible page describes a study planner/mentor, simple onboarding and Google/file plan restoration: https://capcompass.app/. This app uses a calm companion-like approach and its own design; no proprietary assets were copied.
- Official Balbharati library: https://books.ebalbharati.in/ebook.aspx. Science I contents were directly available at https://ebooks.ebalbharati.in/pdfs/1003000265.pdf. Science II: https://ebooks.ebalbharati.in/pdfs/1003000270.pdf. Other textbook PDF fetches were size-limited; core chapter lists are starter headings to check, not a claim of an audited 2026–27 syllabus.
- English headings and all Hindi/other-language slots are flagged “Check book”. The 128 count includes grammar/writing/practice units; it is not an official chapter count. Exact language book/course choices remain unknown.
- Maharashtra board: https://www.mahahsscboard.in/. The older official rules PDF lists six compulsory subjects: https://www.mahahsscboard.org.in/img/rules_db2a7f8176.pdf. Current 2027 best-five/pass/admission details were not authoritatively established. Best-five is configurable and must be confirmed with school. A secondary explanatory source describes top five of six: https://targetpublications.org/blog/maharashtra-ssc-2026-best-of-5-rule-explained.
- Prelims **10 December 2026** and boards **15 February 2027** are user-supplied planning dates, not independently verified official timetables. At 6 November these are 34 and 101 days away.
- Official Firebase references: https://firebase.google.com/docs/reference/rest/auth, https://firebase.google.com/docs/firestore/use-rest-api, https://firebase.google.com/docs/firestore/security/rules-conditions, https://firebase.google.com/docs/hosting/full-config, https://firebase.google.com/docs/firestore/quotas.

## Implementation limits

No school timetable integration, push delivery backend, teacher gradebook, official result import or automatic syllabus updates. The UI is English; Hindi titles can be entered in Unicode. Test scores are not comparable by difficulty automatically. Browser storage and account security follow the device and Firebase project configuration. Treat a shared phone as a shared data environment.

## Project layout

`dist/`: static PWA. `dist/core.js`: calculations and seed. `dist/cloud.js`: Firebase Auth/Firestore REST. `firestore.rules`: backend security. `firebase.json`: Hosting/emulator configuration. `tests/`: calculation/validation tests. No frontend dependency download is required.
