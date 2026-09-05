# PWN SHAKTI Mobile Command — Premium PWA

This is the improved SHAKTII mobile app prototype. It is a standalone PWA, not Expo.

## Run locally on Windows

Double click `start-local-server.bat` or run:

```powershell
cd C:\Users\HP\Downloads\shaktii-mobile-pwa-pro-v3
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Install as an app

For real phone installation, deploy this folder to Vercel/Netlify/GitHub Pages, open the HTTPS URL on phone Chrome, then tap **Install App** or **Add to Home Screen**.

Local file opening (`file://index.html`) will preview the design, but proper app installation needs a hosted URL.

## Screens included

- Home command overview
- Alerts inbox
- Investigation graph
- Blockchain intelligence
- SHAKTII AI assistant

## Visual upgrades

- Website-like dark grid background
- JetBrains Mono + premium heading styling
- Purple glow accents
- Critical red pulse effects
- App-style top safe area and bottom navigation
- Install app CTA
- Service worker + manifest
