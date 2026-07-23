const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = !app.isPackaged
let mainWindow = null
let tray = null
let quitting = false

function getIcon() {
  const iconPath = path.join(__dirname, 'icon.png')
  if (fs.existsSync(iconPath)) {
    return nativeImage.createFromPath(iconPath)
  }
  // 16x16 green-ish placeholder
  return nativeImage.createEmpty()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 720,
    minWidth: 360,
    minHeight: 560,
    show: false,
    backgroundColor: '#1a2f28',
    title: 'LanaOnline',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173/?role=pc')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      search: 'role=pc',
    })
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  const icon = getIcon()
  tray = new Tray(icon.isEmpty() ? nativeImage.createFromDataURL(createTrayDataUrl()) : icon)
  tray.setToolTip('LanaOnline')
  tray.on('click', () => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.focus()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  updateTrayMenu('Online')
}

function createTrayDataUrl() {
  // Tiny 16x16 PNG (green circle) as data URL fallback
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAHklEQVQ4T2NkYGD4z0ABYBzVMKoBBgYGBgYGBgYGBgYGAQEAAP//AwAAfQAB6nQ0VwAAAABJRU5ErkJggg=='
}

function updateTrayMenu(statusLabel) {
  if (!tray) return
  const menu = Menu.buildFromTemplate([
    { label: `Status: ${statusLabel}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Fenster öffnen',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: 'Mit Windows starten',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          openAsHidden: true,
        })
      },
    },
    { type: 'separator' },
    {
      label: 'Beenden',
      click: () => {
        quitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
}

app.whenReady().then(() => {
  // Autostart default: on for installed app
  if (!isDev) {
    const settings = app.getLoginItemSettings()
    if (!settings.openAtLogin) {
      app.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true,
      })
    }
  }

  createWindow()
  createTray()

  // Start hidden if launched at login
  if (app.getLoginItemSettings().wasOpenedAtLogin) {
    mainWindow.hide()
  }
})

app.on('window-all-closed', (e) => {
  e.preventDefault()
})

app.on('before-quit', () => {
  quitting = true
})

ipcMain.on('status-changed', (_event, label) => {
  updateTrayMenu(label || '—')
  if (tray) tray.setToolTip(`LanaOnline — ${label || '—'}`)
})

ipcMain.on('notify-message', (_event, payload) => {
  const { title, body } = payload || {}
  if (!Notification.isSupported()) return
  const n = new Notification({
    title: title || 'Nachricht von Lana',
    body: body || '',
    silent: false,
  })
  n.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  n.show()
})

ipcMain.handle('get-platform', () => process.platform)

ipcMain.on('open-external', (_event, url) => {
  if (typeof url === 'string') shell.openExternal(url)
})
