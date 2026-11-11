# Native App Store Release Runbook (Google Play & Apple App Store)

SOIL ships native Capacitor 8 apps alongside the web deployment (`https://soil.app`) from the same Angular 21 codebase. Always run `npm run deploy` **first** so `package.json`, `angular.json`, `src/index.html`, and `ios/App/App.xcodeproj/project.pbxproj` share the bumped semantic version before building/submitting store binaries.

---

## 1. Version & Build Number Formula

Both stores derive integer build numbers deterministically from `package.json` (`X.Y.Z`):

- **iOS (`CURRENT_PROJECT_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`)**:
  - Updated automatically by `scripts/deploy.js`: `Major * 100000 + Minor * 1000 + Patch * 10` (e.g. `3.4.19` -> `304190`).
  - `MARKETING_VERSION` is synced to `X.Y.Z`.
  - If re-uploading a hotfix build for the *same* `MARKETING_VERSION`, increment the ones digit (`+1` .. `+9`, e.g. `304191`) or bump a patch version.
- **Android (`versionCode` in `android/app/build.gradle`)**:
  - Computed dynamically at Gradle evaluation time from `package.json`: `Major * 100000 + Minor * 1000 + Patch * 10 + buildOffset`.
  - `versionName` reads `package.json` `version` directly.

---

## 2. Google Play Store (`app.soil.twa`)

### Identifiers & Signing
- **Application ID**: `app.soil.twa` (preserved from legacy TWA listing; Play App Signing enabled).
- **Upload Keystore**: `android/signing.keystore` (gitignored), alias `soil`
  - `SHA1`: `47:A2:A0:FB:08:4C:56:61:10:2E:A3:50:86:27:17:FB:72:BE:F1:4E`
  - `SHA256`: `A7:D5:AB:FE:C2:09:B5:BA:53:F1:71:8E:DC:C0:25:D2:53:66:7C:10:8A:0C:F2:AA:99:5C:BC:54:D4:BD:69:5E`
- **macOS Keychain Backups** (also backed up in Google Password Manager):
  - Keystore password: account `soil`, service `app.soil.twa.keystore-password`
  - Base64 keystore binary: account `soil`, service `app.soil.twa.keystore-base64` (auto-restored by `scripts/ensure-android-keystore.mjs` when `android/signing.keystore` is absent).
- **R8 / Deobfuscation**: `minifyEnabled true` and `shrinkResources true` are enabled in `android/app/build.gradle` with rules in `android/app/proguard-rules.pro`, automatically embedding `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map` inside the `.aab` so Play Console never warns about missing deobfuscation symbols.

### Build & Upload Steps
1. Build the signed release App Bundle:
   ```zsh
   npm run cap:bundle:android
   ```
   Output artifact: `android/app/build/outputs/bundle/release/app-release.aab`.
2. In **Google Play Console** (`SOIL: Planspiel Landwirtschaft`, `app.soil.twa`):
   - Go to **Testen und veröffentlichen -> Produktion -> Neues Release erstellen**.
   - Upload `android/app/build/outputs/bundle/release/app-release.aab`.
   - Paste concise German release notes (`<de-DE>...</de-DE>`), click **Weiter -> Speichern**, then go to **Veröffentlichungsübersicht** and click **Änderungen zur Überprüfung senden**.

### Play Console Review Account & Policy Settings
- **App Access Demo Teacher Account**: `no-reply@example.com` (UID `ueRjOAxmpdg04DFdRSuyIjWZ17v2`, `role: admin` in Firestore; **never** overwrite its password while a Google Play review is active).
- **Target Audience / Families**: Do **not** opt into Google Play's "Designed for Families / Under 13" program (select ages 13+ / general audience so teacher OAuth sign-in is permitted without Families-policy SDK blocks).

---

## 3. Apple App Store (`app.soil`)

### Identifiers, Cloud Signing & Sign in with Apple
- **Bundle ID**: `app.soil`
- **Apple Team ID**: `XUG7UA3678` | **App Store Connect App ID**: `6757822396`
- **Firebase iOS App ID**: `1:167590574128:ios:6d3f7e8e62d76eeb4f95f5`
- **Sign in with Apple** (mandatory under App Review Guideline 4.8 alongside Google Sign-In):
  - Native iOS flow: `SignInWithApplePlugin` (`ASAuthorizationAppleIDProvider` + SHA-256 nonce) in `ios/App/App/SceneDelegate.swift` + `ios/App/App/App.entitlements` (`com.apple.developer.applesignin`).
  - Web OAuth Service ID: `app.soil.web` | Key ID: `3GKVPK3P84` (`.p8` backed up in macOS Keychain under account `3GKVPK3P84`, service `app.soil.apple-signin-p8-base64`, and in Google Password Manager).
  - Universal Links / Associated Domains: `XUG7UA3678.app.soil` in `public/.well-known/apple-app-site-association` and `src/server.ts`.

### Why Xcode Cloud Builds the Release Archive
Local `xcodebuild archive` with Automatic Signing requires at least one physical iOS device UDID registered on the Apple Developer account to generate a local provisioning profile. **Xcode Cloud** signs in the cloud using Apple's Cloud-Managed Distribution Certificate without requiring any registered physical device:
- Tracked in Git: `ios/` (with `ios/App/App/public/*` gitignored except `.gitkeep`).
- Post-clone hook: `ios/App/ci_scripts/ci_post_clone.sh` (`chmod +x` required!) installs Node.js via Homebrew, runs `npm ci`, `npm run build`, and `npx cap sync ios` before Xcode archives `ios/App/App.xcodeproj`.
- Workflow: **`Default`** in Xcode Cloud includes **`Archive - iOS`** (`Deployment Preparation: TestFlight and App Store`) triggered automatically on pushes to `main` (i.e. automatically during `npm run deploy`).

### Submitting an iOS Update in App Store Connect
1. Run `npm run deploy [patch|minor|major]`. Pushing `main` automatically triggers the Xcode Cloud `Default` workflow (`Archive - iOS`).
2. Wait (~10–15 min) until the Xcode Cloud build finishes `Saving Artifacts` and TestFlight processing completes.
3. In **App Store Connect -> SOIL: Planspiel Landwirtschaft**:
   - Create a new iOS version matching `MARKETING_VERSION` (e.g. `3.4.20`).
   - Fill in **Neuheiten in dieser Version** (German release notes, informal *"du"*).
   - Under **Build**, select the new Xcode Cloud build (`304200`).
   - Verify **Informationen zur App-Prüfung** (pre-populated from previous version, see credentials below).
   - Click **Sichern**, then **Zur Prüfung hinzufügen** -> **Zur App-Prüfung übermitteln**.

### App Store Review Credentials & Critical Settings (Do Not Change Carelessly)
- **Demo Teacher Account**:
  - **Benutzername**: `appreview@example.com` (UID `AaCwB0D6MYRKLHF2La6wY4hIlnG3`, `role: admin`, `status: active`, `emailVerified: true`; `@example.com` matches `isTestEmail()` so reviewer games never enter `research_games`).
  - **Passwort**: stored in macOS Keychain under service `app.soil.appstore-review-demo` (`security find-generic-password -a "appreview@example.com" -s "app.soil.appstore-review-demo" -w`).
  - **Anmerkungen Template**:
    ```text
    1. Single-player mode requires NO sign-in: On the start screen, tap "Einzelspiel starten" -> "Neues lokales Spiel starten" to play immediately on-device against AI farms.
    2. Teacher / Classroom Host Dashboard (optional): Tap "Spielleitung (Login)" at the bottom of the start screen and sign in with the provided demo teacher credentials (appreview@example.com) or "Sign in with Apple" to create multiplayer classroom games and generate 6-character PINs for students.
    3. Student multiplayer join requires NO account: Students tap "Mehrspieler beitreten" on the start screen and enter the 6-character classroom PIN generated by the teacher.
    4. All features are 100% free, ad-free, and non-commercial educational software without in-app purchases.
    ```
- **Age Rating (`4+`) & Kids Category Trap**:
  - Keep calculated rating at **`4+`** (important so school MDMs / Apple School Manager iPads do not block installation).
  - Under Step 7 (*Alterskategorien und Überschreiben*), **ALWAYS keep `Nicht anwendbar`** — **NEVER** select `Für Kinder empfohlen` (Kids Category, Guideline 1.3), which permanently locks the app into preschool/elementary rules and causes immediate rejection due to external scientific DOI links and teacher login flows without a Parental Gate.
  - Leave *URL zur Alterseignung (optional)* empty.
- **Game Center**: Leave **unchecked** (no `com.apple.developer.game-center` entitlement or `GKLocalPlayer` integration; enabling it in App Store Connect causes Guideline 2.1 rejection).
- **Encryption / Export Compliance**: `ITSAppUsesNonExemptEncryption = false` is set in `ios/App/App/Info.plist` (standard HTTPS/TLS only), skipping manual export-compliance prompts on TestFlight builds.
- **EU Digital Services Act (DSA)**: Declared as **Non-Trader** (*„Ich bin kein Händler gemäß dem Gesetz über digitale Dienste …“*) — non-commercial, ad-free OER project by an individual; full EU distribution remains active without publishing a private phone number on the Store page.

---

## 4. Store Listing Copy & Screenshot Specs

- **Store Copy Rules (Both Stores)**:
  - Always use informal **"du"**.
  - **Never** prescribe fixed school grade levels (avoid *"ab Klasse 7"*).
  - **Never** hardcode fixed round counts like *"10 Runden"* or *"10 bis 20 Jahre"* because round length is configurable; write *"über mehrere Runden"* or *"über mehrere Wirtschaftsjahre"*.
- **Apple Screenshot Dimensions** (generated in `marketing/store-assets/apple/`, 24-bit RGB PNG **without alpha channel**, verified via `sips -g pixelWidth -g pixelHeight -g hasAlpha`):
  - **iPhone mit Dynamic Island (6.3")**: `1206 × 2622 px` (`apple/iphone-dynamic-island/`)
  - **iPhone Duo (unfolded)**: `2853 × 2007 px` (`apple/iphone-duo/`)
  - **iPad 13" Display**: `2752 × 2064 px` (`apple/ipad-13/`)

---

## 5. Open First-Submission Action: Apple Guideline 2.1 Resubmission (`v3.4.19 (3)`)

Apple paused initial review (`Guideline 2.1 - Information Needed - New App Submission`, Submission ID `c8581c92-ce83-41d0-af12-ee45dda14aa9`) requesting **(1)** a physical-device screen recording attached to App Review Information and **(2)** structured answers to items 2–6 in the Review Notes. **No new binary is required** (`3.4.19 (3)` already includes in-app account deletion at `/delete-account` via the top-right icon in `/admin`).

1. **Record 60–90s Screen Video on Physical School iPad (via TestFlight)**:
   - Invite Apple ID under **App Store Connect -> TestFlight -> Interne Tests**, install **TestFlight** on the iPad, and install **SOIL: Planspiel Landwirtschaft (`3.4.19 (3)`)**.
   - Start iOS Screen Recording **from the iPad Home Screen**, then tap the **SOIL** app icon (*must begin with launching the app*).
   - Show **Single-Player**: *Einzelspiel starten -> Neues lokales Spiel starten -> plant 1 parcel -> Jahr beenden*.
   - Show **Teacher Flow & Account Deletion**: return to start -> *Spielleitung (Login)* -> briefly show *Registrieren* -> sign in with a **separate disposable demo account** (e.g. `videodemo@example.com`, **do NOT delete `appreview@example.com`**) -> create a multiplayer game (6-char PIN visible) -> tap the top-right crossed-out user icon (`Konto löschen` -> `/delete-account`) and delete the disposable account.
   - Upload the `.mp4` / `.mov` under **Informationen zur App-Prüfung -> Anhang**.
2. **Paste Structured 6-Point Notes into *Anmerkungen* & Resubmit**:
   - Cover: (1) reference to attached physical-device recording; (2) purpose & general public/educational audience (secondary/vocational/university learners, teachers, and general public interested in sustainable agriculture — not restricted to a single organization under Guideline 3.2); (3) setup instructions & `appreview@example.com` credentials + single-player no-login & student 6-char PIN flows; (4) external services (`Firebase Auth / Firestore / Cloud Functions` in `europe-west4`, `Sign in with Apple`, `Google Sign-In`, and optional server-side `Google Cloud Vertex AI` agronomy advisor); (5) confirmation of identical functionality across all regions; (6) confirmation of non-regulated industry & self-authored MIT / CC BY 4.0 OER content.
