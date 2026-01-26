# Soil Quality Assurance (QA) Guide

This document provides a comprehensive guide for manual Quality Assurance testing of the Soil application.

## Prerequisites
- Run the application locally: `npm run start`
- Ensure you are in development mode to see the **Test Mode** toggle on the landing page.

---

## 1. Landing Page & Public Pages
**URL:** [http://localhost:4200/](http://localhost:4200/)

| Feature | Steps | Expected Result | E2E Covered |
|---------|-------|-----------------|-------------|
| Hero Section | Observe background image and main title. | Background image loads correctly; title "SOIL" is visible and styled. | No |
| Info Sections | Scroll down to "Über das Spiel" and "Nachhaltigkeit". | Content is readable and properly formatted. | No |
| Manual | Click "Handbuch" or go to `/manual`. | The user manual opens with all sections (Crops, Soil, etc.). | No |
| Background | Click "Hintergrund" or go to `/info`. | The background information page opens. | No |
| Impressum | Find and click the Impressum link in the footer. | Impressum page displays legal information. | No |

---

## 2. Onboarding & Registration
**URL:** [http://localhost:4200/admin/register](http://localhost:4200/admin/register)

| Feature | Steps | Expected Result | E2E Covered |
|---------|-------|-----------------|-------------|
| Teacher Registration | Fill out the registration form (Name, Institution, Reason). | Registration successful; user is prompted to verify email. | No |

---

## 3. Teacher Dashboard (Admin)
**URL:** [http://localhost:4200/admin/login](http://localhost:4200/admin/login)
*Use **Mock Admin** from the Landing Page test toggle.*

| Feature | Steps | Expected Result | E2E Covered |
|---------|-------|-----------------|-------------|
| Game Creation | Fill form: Name, Players (5), Rounds (10). Click Create. | New game appears in the list; Game ID and PIN are displayed. | Yes |
| Game List | Toggle "Papierkorb" (Trash) and "Aktive Spiele". | List filters correctly; Trash shows deleted games. | No |
| Player Management | Expand a game, change a player from "Human" to "AI". | Player slot updates immediately to "KI". | No |
| Round Deadline | Set a deadline for a round. | Deadline is saved and displayed in the UI. | No |
| Finance Modal | Click on a player's capital/status to open Finance. | Modal shows detailed breakdown of profit/loss. | No |
| Logout | Click Logout button. | User is redirected to landing page; test mode cleared. | Yes |

---

## 4. Super Admin Console
**URL:** [http://localhost:4200/admin/super](http://localhost:4200/admin/super)
*Use **Mock SuperAdmin** from the Landing Page test toggle.*

| Feature | Steps | Expected Result | E2E Covered |
|---------|-------|-----------------|-------------|
| System Stats | Observe the statistics cards at the top. | Displays counts for total games, users, teachers, etc. | No |
| Quota Management | Click "Limit" on a teacher and change it to 20. | The new quota is saved and displayed. | No |
| Feedback Management | View feedback list, click "Antworten". | Modal opens to type a response. | No |
| Global Game View | Click "Spiele" on a teacher to see all their games. | List of games for that specific teacher is displayed below. | No |

---

## 5. Game Experience (Player)
**URL:** [http://localhost:4200/game-login](http://localhost:4200/game-login)
*Use **Mock Player** from the Landing Page test toggle or log in with Game ID/PIN.*

| Feature | Steps | Expected Result | E2E Covered |
|---------|-------|-----------------|-------------|
| Parcel Selection | Click and drag over multiple parcels. | Multi-selection highlight appears; Planting Modal opens. | Yes |
| Planting | Select "Weizen" (Wheat). | Parcels update with wheat image; Yield/Soil stats update. | Yes |
| Round Submission | Click "Nächste Runde", adjust machines, click Confirm. | Round Result Modal appears with profit/events summary. | Yes |
| Game End | Complete all rounds (use Mock Mode to skip). | Final results screen appears; no further actions possible. | No |
| HUD Details | Hover over capital, soil quality, and nutrition. | Tooltips or highlights provide additional info. | No |

---

## 6. Email Notifications (Manual Verification Required)
*These require a real backend or observing logs in Mock Mode.*

| Notification | Trigger | What to check |
|--------------|---------|---------------|
| Game Invite | Admin sends game details to an email. | Email contains Game ID and Login URL. |
| Player Invite | Admin sends player-specific invite. | Email contains personal PIN and Login URL. |
| Password Reset | User requests password reset. | Email contains reset link. |

---

## Tips for Testing
- **DevTools Console:** Check for any errors (red text) during navigation or actions.
- **Responsive Design:** Test on both Desktop and Mobile (using browser emulator).
- **Network Tab:** Observe calls to Firebase functions (in non-mock mode).
