# PWN SHAKTI Secure Data Command

This repository contains the standalone installable SHAKTII application.

It is intentionally separate from the marketing website.

## What this app is

A lightweight PWA for demonstrating the full cybersecurity + blockchain software flow:

- Login / workspace entry
- Dashboard overview
- Secure files vault
- File detail pages
- Upload and encryption workflow
- Access control
- Blockchain verification ledger
- Security monitoring
- Analytics
- Audit logs
- Reports
- Notifications and alarm demo
- Settings and profile

## Why PWA

For the hackathon demo, this is faster and more reliable than Expo/native builds:

- Installable from Vercel on phone
- Very lightweight
- No Android SDK or Expo Go version issues
- Runs on desktop and mobile
- Supports offline app shell through service worker
- Can connect to Docker backend later through API hooks

## Backend integration

The app has a dedicated `api.js` service layer.

By default, it uses demo data from `data.js`.

To connect a Docker backend, open the app with:

```text
https://your-app-url.vercel.app/dashboard?api=http://localhost:8000
```

or set the backend URL in Settings.

Expected backend endpoints can be mapped to:

```text
GET  /api/dashboard
GET  /api/files
GET  /api/files/:id
POST /api/files/upload
GET  /api/blockchain/records
GET  /api/blockchain/records/:id
POST /api/blockchain/verify
GET  /api/security/alerts
GET  /api/security/alerts/:id
POST /api/security/contain
GET  /api/analytics
GET  /api/activity
GET  /api/reports
POST /api/reports/generate
```

## Local run

No build step is required.

```powershell
python -m http.server 5173
```

Open:

```text
http://localhost:5173/dashboard
```

## Vercel

Import the repository into Vercel as a static project. `vercel.json` contains SPA rewrites so routes like `/files/FL-001` refresh correctly.

## Jury demo flow

```text
Login
→ Dashboard
→ Upload & Encrypt
→ View Protected File
→ Verify Blockchain Record
→ Security Monitoring
→ Trigger Alarm
→ Alert Detail
→ Containment Action
→ Analytics
→ Audit Logs
→ Reports
```
