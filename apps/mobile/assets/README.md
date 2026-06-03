# Mobile App Assets

Diese Assets müssen vor dem ersten Build erstellt werden:

- `icon.png` — 1024×1024 PNG, App Icon
- `splash.png` — 1284×2778 PNG (oder größer), Splash Screen
- `adaptive-icon.png` — 1024×1024 PNG, Android Adaptive Icon Foreground
- `favicon.png` — 48×48 PNG, Web Favicon
- `notification-icon.png` — 96×96 transparent PNG, Push Notification Icon

Für die lokale Entwicklung mit Expo Go reicht es, jeweils ein 1024×1024 blau gefärbtes PNG zu hinterlegen. Beispiel-Befehl mit ImageMagick:

```bash
magick -size 1024x1024 xc:#2563eb icon.png
magick -size 1024x1024 xc:#2563eb adaptive-icon.png
magick -size 1284x2778 xc:#2563eb splash.png
magick -size 48x48 xc:#2563eb favicon.png
magick -size 96x96 xc:transparent notification-icon.png
```

Für Produktion: Logo der ADB als App-Icon nutzen.
