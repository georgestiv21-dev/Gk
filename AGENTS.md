# Greek Streaming - Project & VPS Deployment Architecture

## VPS Server Details
- **Server IP:** `185.193.125.180`
- **SSH User:** `root`
- **Application Directory:** `/root/Gk`
- **PM2 Service Name:** `greek-cartoons` (port 3000)
- **Domain:** `https://greek-streaming.com`

## Database & Data Persistence Rules
- **Live Database File:** `/root/Gk/database.json`
- **IMPORTANT:** Never overwrite, wipe, or hardcode data over `database.json`. It contains all live user accounts, subscription expiration dates, device IDs, license keys, movies, series, episodes, and suggestions.
- **Git Ignore:** `database.json` is ignored so `git pull` does not touch or overwrite production data.

## Security & Anti-Capture Architecture
- **Environment:** Exclusive access for Native APKs (Smart TV, Android TV, TV Box, Android Mobile).
- **Anti-Emulator Shield:** Blocks BlueStacks, Nox, LDPlayer, MEmu, WSA, and PC VMs for all users.
- **DRM & Anti-Recording:** FLAG_SECURE + CSS DRM overlays + APK wrappers prevent screenshots and screen capture.
- **Super Admin:** `admings`

## Standard Update Command on VPS
```bash
cd /root/Gk && git pull origin main && npm run build && pm2 restart all
```
