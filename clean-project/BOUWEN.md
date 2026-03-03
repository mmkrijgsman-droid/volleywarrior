# 📱 VolleyWarrior – APK bouwen

## Wat heb je nodig?
- [Node.js](https://nodejs.org) (LTS versie)
- [Android Studio](https://developer.android.com/studio)

---

## Stap 1 – Dependencies installeren
Open een terminal in deze map en voer uit:

```
npm install
npm install @capacitor/core @capacitor/cli @capacitor/android
```

---

## Stap 2 – Web app bouwen
```
npm run build
```

---

## Stap 3 – Android project aanmaken
```
npx cap add android
```

---

## Stap 4 – Bestanden overschrijven (BELANGRIJK)
Kopieer de inhoud van de map `android-overrides\` naar `android\`
Klik op "Vervangen voor alle conflicten" als Windows dat vraagt.

Dit plaatst:
- ✅ VolleyWarrior icoon op homescreen
- ✅ VolleyWarrior splashscreen
- ✅ Fullscreen modus (geen statusbalk/navigatiebalk)

---

## Stap 5 – Sync en open Android Studio
```
npx cap sync
npx cap open android
```

---

## Stap 6 – APK bouwen
In Android Studio:
1. Wacht tot Gradle klaar is (balk onderaan)
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Klik op **"locate"** als het klaar is

APK staat in: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## Stap 7 – Installeren op telefoon
- Stuur APK naar telefoon (USB, WhatsApp, mail)
- Instellingen → Beveiliging → Onbekende apps toestaan
- Open de APK en installeer
