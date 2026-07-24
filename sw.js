/* LanaOnline service worker — shows alerts when the tab/browser is closed. */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let title = 'LanaOnline'
  let body = 'Neue Aktivität'
  try {
    const data = event.data ? event.data.json() : null
    if (data) {
      if (data.title) title = String(data.title)
      if (data.body) body = String(data.body)
    } else if (event.data) {
      body = event.data.text()
    }
  } catch {
    try {
      body = event.data ? event.data.text() : body
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const pageOpen = clients.some((c) => c.visibilityState === 'visible')
      if (pageOpen) return undefined
      return self.registration.showNotification(title, {
        body,
        tag: 'lanaonline',
        renotify: true,
        data: { url: './' },
      })
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || './'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus()
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    }),
  )
})
