# CLAUDE.md — NutriCare

Specialized PWA for post-injury recovery nutrition and medicine tracking. Target user: elderly woman (70+), recovering from hip replacement, broken neck, and concussion. Caregiver also uses the app.

## Running the App

No build step. Open `index.html` directly or serve statically:

```sh
python3 -m http.server 8080
# or
npx serve .
```

Service worker requires HTTPS or localhost to register.

## Architecture

Single-page vanilla JS PWA — no framework, no bundler. All data in `localStorage`.

### Files

| File | Role |
|------|------|
| `index.html` | App shell, 5-tab nav, overlay/drawer, PIN modal, SW registration |
| `styles.css` | Design system — large text (18px base), warm palette, mobile-first |
| `app.js` | `window.NC` — all CRUD, nutrients, nudges, event bus, drawer/toast |
| `db.js` | Seeds 25 foods + 3 starter recipes on first load |
| `notifications.js` | `window.NCNotify` — medicine scheduling, SW notification dispatch |
| `log.js` | `window.NCLog` — daily food log module |
| `foods.js` | `window.NCFoods` — food browser, custom food entry, recipe builder |
| `medicines.js` | `window.NCMeds` — medicine tracker, caregiver PIN, dose actions |
| `reports.js` | `window.NCReports` — nutrient progress bars, nudges, 7-day history |
| `profile.js` | `window.NCProfile` — user profile, targets, data export/import |
| `service-worker.js` | Cache-first, versioned — bump `VERSION` to force update |

### Version Updates

Change `VERSION = '1.0.x'` in `service-worker.js` to trigger a cache bust and update banner for installed users.

### Nutrients Tracked (20)

**Macro:** Calories, Protein, Carbs, Fat, Fiber  
**Bone:** Calcium, Vitamin D, Vitamin K, Magnesium, Phosphorus  
**Brain:** Omega-3 DHA, Omega-3 EPA, Choline, B12, Folate, Zinc  
**Heart:** Potassium, Sodium (limit)  
**Recovery:** Vitamin C, Iron

### Caregiver Mode

PIN-protected. First access sets the PIN; subsequent access requires it. Caregivers can: add/edit medicines, edit targets, view all data. Patient view: log food, mark meds taken, view reports.

### Notification System

Uses Web Notifications API + Service Worker `showNotification()`. Scheduling via `setTimeout` in `notifications.js`. Snooze/taken actions handled via SW `notificationclick` → `postMessage` → main thread. Works offline once SW is installed.

### Key Patterns

- `window.NC` — global data/utility namespace (app.js)
- Tab rendering: each module exports `renderToPanel()`, called on `NC.bus.on('tab:changed', ...)`
- Drawer: `NC.openDrawer(title, bodyHTML, footerHTML)` / `NC.closeDrawer()`
- `NC.bus` — mini event bus for cross-module coordination
