# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VolleyWarrior is a volleyball match tracking app built with React and Vite, packaged as an Android app via Capacitor. The UI is in Dutch. It runs entirely client-side with localStorage for persistence (no backend/database).

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (HMR)
npm run build        # Production build to dist/
npm run preview      # Preview production build
```

Android APK build (requires Android Studio): see `BOUWEN.md` for full steps. Key commands:
```bash
npm run build
npx cap sync         # Sync web build to Android project
npx cap open android # Open in Android Studio for APK build
```

No test runner or linter is configured.

## Architecture

**Modular structure** — code is split across multiple files:

| File | Purpose |
|------|---------|
| `src/App.jsx` (~234 lines) | Main component, layout, court UI |
| `src/hooks/useMatchState.js` | All state + game logic (custom hook) |
| `src/components/BottomSheet.jsx` | Mobile drag-to-snap sheet |
| `src/components/Court.jsx` | Court rendering, player positions |
| `src/components/Modals.jsx` | All modal dialogs (7 modals) |
| `src/components/Icons.jsx` | 6 SVG icon components |
| `src/helpers/constants.js` | TABS, getRoleLabel, shirtColors |
| `src/tabs/PlayersTab.jsx` | Spelers tab content |
| `src/tabs/LineupTab.jsx` | Opstelling tab content |
| `src/tabs/SubsTab.jsx` | Wissels tab content |
| `src/tabs/StatsTab.jsx` | Stats tab content |
| `src/tabs/MatchesTab.jsx` | Wedstrijden tab content |
| `src/assets/logo.js` | Base64-encoded logo image |

**State management**: All state uses React hooks (useState/useEffect/useRef) inside the `useMatchState` custom hook. No external state library.

**Data persistence**: localStorage with keys `volleyballPlayers` (roster) and `volleyballMatches` (match history).

**Styling**: Mix of Tailwind CSS utility classes and inline styles. Dark theme (#0f172a background, red/orange #dc2626 accents). Note: some Tailwind classes (e.g. `fixed`) don't compile — use inline `style` as fallback.

**Responsive**: Mobile detection via `window.innerWidth < 640`. Mobile gets BottomSheet; desktop has no sidebar (SideMenu was removed — deprecated).

## Key Concepts

- **5 tabs**: Spelers (Players), Opstelling (Lineup), Wissels (Substitutions), Stats, Wedstrijden (Matches)
- **Player roles**: setter (SPE), outside (PL), middle (MID), opposite (DIA), libero (L)
- **Match format**: Best-of-5 sets, sets to 25 points (5th set to 15)
- **BottomSheet snap points**: `[0.12, 0.52, 0.92]` — peek, half, full. Chevron cycles through; X closes.
- **Capacitor config**: App ID is `nl.volleywarrior.app`, web output dir is `dist/`
- **android-overrides/**: Contains custom icons, splash screen, and fullscreen config; must be copied over the `android/` directory before building APK

## Version History

| Version | APK Name | Date | Changes |
|---------|----------|------|---------|
| V1 | `VolleyballWarriorV1.apk` | 2026-03-03 | Modular code split, 3 snap points BottomSheet, SideMenu removed, all tabs functional |

## APK Build (quick reference)

```bash
npm run build
npx cap sync
cp -r android-overrides/* android/     # icons, splash, fullscreen
cd android
JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
# Rename: cp app-debug.apk VolleyballWarriorV<N>.apk
```

`android/local.properties` must contain: `sdk.dir=C\:/Users/mmkri/AppData/Local/Android/Sdk`
