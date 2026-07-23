# LanaOnline

Status + Pop-up-Nachrichten für dich (PC) und Lana (iPhone) — **kostenlos**.

## Features

- Status: Online, Offline, Beschäftigt, Am Coden, Am Zocken, Brauche allein Zeit
- Lana schreibt → **Pop-up auf deinem Windows-PC**
- **Desktop-App** mit Tray + **Autostart mit Windows**
- Website von **überall** erreichbar (nicht nur WLAN)
- Passwort-Standard: `lana2026`

## Schnellstart Desktop

```powershell
cd C:\Users\Admin\Desktop\Coding\LanaOnline
npm install
npm run dev:desktop
```

Installer bauen:

```powershell
npm run build:desktop
```

Danach `release\LanaOnline-…Setup.exe` installieren. Autostart ist standardmäßig an (Tray → Rechtsklick → „Mit Windows starten“).

## Website online (für Lanas iPhone)

```powershell
npm run build
npx --yes surge ./dist lanaonline-DEINNAME.surge.sh
```

Surge fragt einmal nach E-Mail (kostenlos). Die URL in `.env` eintragen:

```
VITE_PUBLIC_URL=https://lanaonline-DEINNAME.surge.sh
```

Dann Desktop neu bauen/`npm run build`, damit „Link kopieren“ die öffentliche URL nimmt.

Lana öffnet den Link (Passwort `lana2026`) → „Ich bin Lana“ → fertig.  
Optional: Safari → Teilen → **Zum Home-Bildschirm**.

## Technik

- Live-Sync über MQTT (öffentlicher Broker, privater Room-Code in der URL)
- Kein Firebase-Konto nötig
- Electron-Desktop-App für Windows
