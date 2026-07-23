# LanaOnline

Status + Pop-up-Nachrichten für dich (PC) und Lana (iPhone) — **kostenlos**.

## Live-Website (außerhalb WLAN)

**https://geleckte.github.io/LanaOnline/**

Passwort: `lana2026`

Auf dem PC in der App unter „Link für Lana“ den fertigen Link mit Room-Code kopieren und ihr schicken (wichtig: gleicher Room).

## Features

- Status: Online, Offline, Beschäftigt, Am Coden, Am Zocken, Brauche allein Zeit
- Lana schreibt → **Windows-Pop-up** auf deinem PC
- **Desktop-App** mit Tray + **Autostart mit Windows**
- Website von überall (LTE / anderes WLAN)

## Desktop-App starten

- Verknüpfung **LanaOnline** auf dem Desktop, oder
- `release\win-unpacked\LanaOnline.exe`
- Installer: `release\LanaOnline-1.0.0-x64.exe`

Autostart: Shortcut im Windows-Autostart-Ordner + in der App Tray → „Mit Windows starten“.

## Entwicklung

```powershell
npm install
npm run dev:desktop
```

Website neu deployen:

```powershell
npm run deploy:web
```

## Technik

- UI: React + Vite
- Live-Sync: MQTT (privater Room-Code in der URL)
- Hosting: GitHub Pages
- Desktop: Electron (Windows)
