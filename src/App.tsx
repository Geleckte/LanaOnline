import { useEffect, useMemo, useRef, useState } from 'react'
import {
  connectRoom,
  ensureRoomInUrl,
  getOrCreateRoomId,
  getPairPassword,
  isUnlocked,
  markRead,
  sendMessage,
  setStatus,
  shareUrl,
  subscribeMessages,
  subscribeStatus,
  unlock,
  type ChatMessage,
  type PresenceStatus,
} from './sync'
import { STATUSES, statusByKey, type StatusKey } from './statuses'

type Role = 'pc' | 'lana' | null

function detectRole(): Role {
  const params = new URLSearchParams(window.location.search)
  const q = params.get('role')
  if (q === 'pc' || q === 'lana') return q
  if (window.lanaDesktop?.isDesktop) return 'pc'
  const saved = localStorage.getItem('lanaonline_role') as Role
  if (saved === 'pc' || saved === 'lana') return saved
  return null
}

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'gerade eben'
  if (m === 1) return 'vor 1 Min'
  if (m < 60) return `vor ${m} Min`
  const h = Math.floor(m / 60)
  if (h === 1) return 'vor 1 Std'
  if (h < 24) return `vor ${h} Std`
  return 'vor längerem'
}

export default function App() {
  const [role, setRole] = useState<Role>(() => detectRole())
  const [authed, setAuthed] = useState(() => isUnlocked())
  const [connected, setConnected] = useState(false)
  const [status, setStatusState] = useState<PresenceStatus | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [note, setNote] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)
  const [invite, setInvite] = useState('')
  const seenIds = useRef<Set<string>>(new Set())
  const bootstrapped = useRef(false)

  const current = useMemo(() => statusByKey(status?.key), [status])
  const room = useMemo(() => getOrCreateRoomId(), [])

  useEffect(() => {
    ensureRoomInUrl(room)
    setInvite(shareUrl('lana'))
  }, [room])

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!authed) return
    let dead = false
    let unsubStatus = () => {}
    let unsubMessages = () => {}

    void (async () => {
      try {
        await connectRoom(room)
        if (dead) return
        setConnected(true)
        setError('')
        unsubStatus = subscribeStatus((s) => {
          setStatusState(s)
          if (s && window.lanaDesktop) window.lanaDesktop.statusChanged(s.label)
        })
        unsubMessages = subscribeMessages((list) => {
          setMessages(list)
          if (!bootstrapped.current) {
            list.forEach((m) => seenIds.current.add(m.id))
            bootstrapped.current = true
            return
          }
          if (role === 'pc') {
            const fresh = list.filter((m) => m.from === 'lana' && !seenIds.current.has(m.id))
            for (const m of fresh) {
              popNotify(m.text)
              seenIds.current.add(m.id)
            }
            const unread = list.filter((m) => m.from === 'lana' && !m.read).map((m) => m.id)
            if (unread.length) void markRead(unread)
          } else {
            list.forEach((m) => seenIds.current.add(m.id))
          }
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Verbindung fehlgeschlagen')
        setConnected(false)
      }
    })()

    return () => {
      dead = true
      unsubStatus()
      unsubMessages()
    }
  }, [authed, room, role])

  function chooseRole(next: Role) {
    if (!next) return
    localStorage.setItem('lanaonline_role', next)
    setRole(next)
    const url = new URL(window.location.href)
    url.searchParams.set('role', next)
    url.searchParams.set('room', room)
    window.history.replaceState({}, '', url)
  }

  async function applyStatus(key: StatusKey) {
    const def = statusByKey(key)
    const payload: PresenceStatus = {
      key,
      label: def.label,
      note: note.trim(),
      updatedAt: Date.now(),
    }
    await setStatus(payload)
    setStatusState(payload)
    window.lanaDesktop?.statusChanged(def.label)
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || !role) return
    const text = draft.trim()
    setDraft('')
    await sendMessage(text, role)
  }

  function popNotify(body: string) {
    if (window.lanaDesktop) {
      window.lanaDesktop.notifyMessage('Nachricht von Lana', body)
      return
    }
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Nachricht von Lana', { body })
      } else if (Notification.permission !== 'denied') {
        void Notification.requestPermission().then((p) => {
          if (p === 'granted') new Notification('Nachricht von Lana', { body })
        })
      }
    }
  }

  async function copyInvite() {
    const url = shareUrl('lana')
    setInvite(url)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      /* ignore */
    }
  }

  if (!authed) {
    return (
      <Shell>
        <GateScreen onUnlock={() => setAuthed(true)} />
      </Shell>
    )
  }

  if (!role) {
    return (
      <Shell>
        <RoleScreen onChoose={chooseRole} />
      </Shell>
    )
  }

  return (
    <Shell accent={current.color} glow={current.glow}>
      <header className="top">
        <div>
          <p className="eyebrow">
            {role === 'pc' ? 'Dein PC' : 'Für Lana'}
            {connected ? ' · live' : ' · verbindet…'}
          </p>
          <h1 className="brand">LanaOnline</h1>
        </div>
        {role === 'pc' && (
          <button
            className="ghost"
            type="button"
            onClick={() => {
              if ('Notification' in window && Notification.permission !== 'granted') {
                void Notification.requestPermission()
              }
            }}
          >
            Pop-ups
          </button>
        )}
      </header>

      <section className="presence" aria-live="polite">
        <div
          className="presence-orb"
          style={{ background: current.color, boxShadow: `0 0 48px ${current.glow}` }}
        />
        <p className="presence-label">{status?.label ?? 'Noch kein Status'}</p>
        <p className="presence-hint">
          {status?.note || current.hint}
          {status?.updatedAt ? ` · ${relativeTime(status.updatedAt)}` : ''}
        </p>
        <span className="sr-only">{tick}</span>
      </section>

      {role === 'pc' ? (
        <section className="panel">
          <h2>Status setzen</h2>
          <div className="status-grid">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`status-btn ${status?.key === s.key ? 'active' : ''}`}
                style={{ ['--s' as string]: s.color }}
                onClick={() => void applyStatus(s.key)}
              >
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <label className="field">
            <span>Kurze Notiz (optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z.B. noch 20 Min Quest"
              maxLength={80}
            />
          </label>
          <button
            className="primary"
            type="button"
            onClick={() => status && void applyStatus(status.key)}
          >
            Notiz aktualisieren
          </button>

          <div className="invite">
            <h2>Link für Lana</h2>
            <p className="lede">Funktioniert überall — auch außerhalb deines WLANs.</p>
            <code className="invite-url">{invite}</code>
            <button className="primary" type="button" onClick={() => void copyInvite()}>
              Link kopieren
            </button>
          </div>
        </section>
      ) : (
        <section className="panel">
          <h2>Schreib ihm</h2>
          <p className="lede">Die Nachricht platzt bei ihm auf dem PC auf.</p>
          <form className="composer" onSubmit={(e) => void onSend(e)}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Hey, hast du kurz…?"
              maxLength={280}
            />
            <button className="primary" type="submit" disabled={!draft.trim()}>
              Senden
            </button>
          </form>
        </section>
      )}

      <section className="panel messages">
        <h2>Nachrichten</h2>
        <div className="message-list">
          {messages.length === 0 && (
            <p className="empty">Noch nichts — schreibt euch was Schönes.</p>
          )}
          {messages.slice(-40).map((m) => (
            <article key={m.id} className={`bubble ${m.from === role ? 'mine' : 'theirs'}`}>
              <p>{m.text}</p>
              <time>{relativeTime(m.createdAt)}</time>
            </article>
          ))}
        </div>
        {role === 'pc' && (
          <form className="composer" onSubmit={(e) => void onSend(e)}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Antworten…"
              maxLength={280}
            />
            <button className="primary" type="submit" disabled={!draft.trim()}>
              Senden
            </button>
          </form>
        )}
      </section>

      {error && <p className="error">{error}</p>}
    </Shell>
  )
}

function Shell({
  children,
  accent = '#3d9a6a',
  glow = 'rgba(61,154,106,0.25)',
}: {
  children: React.ReactNode
  accent?: string
  glow?: string
}) {
  return (
    <div className="app" style={{ ['--accent' as string]: accent, ['--glow' as string]: glow }}>
      <div className="bg" />
      <main className="frame">{children}</main>
    </div>
  )
}

function RoleScreen({ onChoose }: { onChoose: (r: Role) => void }) {
  return (
    <div className="gate">
      <p className="eyebrow">Willkommen</p>
      <h1 className="brand">LanaOnline</h1>
      <p className="lede">Wer bist du gerade?</p>
      <div className="role-row">
        <button className="primary wide" type="button" onClick={() => onChoose('lana')}>
          Ich bin Lana
        </button>
        <button className="ghost wide" type="button" onClick={() => onChoose('pc')}>
          Ich sitze am PC
        </button>
      </div>
    </div>
  )
}

function GateScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState('')
  const [remember, setRemember] = useState(true)
  const [err, setErr] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === getPairPassword()) {
      unlock(remember)
      onUnlock()
    } else {
      setErr('Falsches Passwort')
    }
  }

  return (
    <div className="gate">
      <p className="eyebrow">Privat</p>
      <h1 className="brand">LanaOnline</h1>
      <p className="lede">Nur für euch beide — Passwort eingeben.</p>
      <form className="composer stack" onSubmit={submit}>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Paar-Passwort"
          autoFocus
        />
        <label className="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Angemeldet bleiben
        </label>
        <button className="primary" type="submit">
          Rein
        </button>
      </form>
      {err && <p className="error">{err}</p>}
    </div>
  )
}
