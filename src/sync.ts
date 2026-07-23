import mqtt, { type MqttClient } from 'mqtt'
import type { StatusKey } from './statuses'

export type PresenceStatus = {
  key: StatusKey
  label: string
  note: string
  updatedAt: number
}

export type ChatMessage = {
  id: string
  text: string
  from: 'lana' | 'pc'
  createdAt: number
  read: boolean
}

const ROOM_KEY = 'lanaonline_room'
const PASS_KEY = 'lanaonline_unlocked'
const BROKER = 'wss://broker.emqx.io:8084/mqtt'

let client: MqttClient | null = null
let roomId = ''

export function getPairPassword(): string {
  return (import.meta.env.VITE_PAIR_PASSWORD as string) || 'lana2026'
}

export function isUnlocked(): boolean {
  return sessionStorage.getItem(PASS_KEY) === '1' || localStorage.getItem(PASS_KEY) === '1'
}

export function unlock(remember: boolean) {
  sessionStorage.setItem(PASS_KEY, '1')
  if (remember) localStorage.setItem(PASS_KEY, '1')
}

export function lock() {
  sessionStorage.removeItem(PASS_KEY)
  localStorage.removeItem(PASS_KEY)
}

export function getOrCreateRoomId(): string {
  const params = new URLSearchParams(window.location.search)
  const fromUrl = params.get('room')
  if (fromUrl && /^[a-zA-Z0-9_-]{8,64}$/.test(fromUrl)) {
    localStorage.setItem(ROOM_KEY, fromUrl)
    return fromUrl
  }
  const saved = localStorage.getItem(ROOM_KEY)
  if (saved) return saved
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20)
  localStorage.setItem(ROOM_KEY, id)
  return id
}

export function ensureRoomInUrl(room: string) {
  const url = new URL(window.location.href)
  if (url.searchParams.get('room') !== room) {
    url.searchParams.set('room', room)
    window.history.replaceState({}, '', url)
  }
}

export function shareUrl(role: 'lana' | 'pc' = 'lana'): string {
  const room = getOrCreateRoomId()
  const publicBase = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/\/$/, '')
  if (publicBase) {
    return `${publicBase}/?room=${encodeURIComponent(room)}&role=${role}`
  }
  if (window.location.protocol === 'file:') {
    return `Website noch nicht gesetzt — room=${room}&role=${role}`
  }
  const url = new URL(window.location.href)
  url.searchParams.set('room', room)
  url.searchParams.set('role', role)
  return url.toString()
}

function topics(room: string) {
  return {
    status: `lanaonline/${room}/status`,
    messages: `lanaonline/${room}/messages`,
    history: `lanaonline/${room}/history`,
  }
}

function publishHistory(c: MqttClient) {
  const snapshot = [...messageStore].sort((a, b) => a.createdAt - b.createdAt).slice(-80)
  c.publish(topics(roomId).history, JSON.stringify(snapshot), { qos: 1, retain: true })
}

export function connectRoom(room: string): Promise<MqttClient> {
  roomId = room
  if (client?.connected) return Promise.resolve(client)

  return new Promise((resolve, reject) => {
    const c = mqtt.connect(BROKER, {
      clientId: `lana_${room.slice(0, 8)}_${Math.random().toString(16).slice(2, 8)}`,
      clean: true,
      reconnectPeriod: 2000,
      connectTimeout: 10000,
    })
    client = c
    c.on('connect', () => {
      const t = topics(room)
      c.subscribe([t.status, t.messages, t.history], { qos: 1 })
      resolve(c)
    })
    c.on('error', (err) => reject(err))
  })
}

export function subscribeStatus(cb: (status: PresenceStatus | null) => void): () => void {
  const c = client
  if (!c) throw new Error('Nicht verbunden')
  const topic = topics(roomId).status
  const handler = (t: string, payload: Buffer) => {
    if (t !== topic) return
    try {
      cb(JSON.parse(payload.toString()) as PresenceStatus)
    } catch {
      cb(null)
    }
  }
  c.on('message', handler)
  return () => {
    c.off('message', handler)
  }
}

export async function setStatus(status: PresenceStatus) {
  const c = client
  if (!c) throw new Error('Nicht verbunden')
  c.publish(topics(roomId).status, JSON.stringify(status), { qos: 1, retain: true })
}

type MessageHandler = (messages: ChatMessage[]) => void

const messageStore: ChatMessage[] = []
const messageListeners = new Set<MessageHandler>()

function emitMessages() {
  const snapshot = [...messageStore].sort((a, b) => a.createdAt - b.createdAt)
  messageListeners.forEach((fn) => fn(snapshot))
}

export function subscribeMessages(cb: MessageHandler): () => void {
  const c = client
  if (!c) throw new Error('Nicht verbunden')
  const t = topics(roomId)
  messageListeners.add(cb)
  cb([...messageStore].sort((a, b) => a.createdAt - b.createdAt))

  const handler = (topicName: string, payload: Buffer) => {
    try {
      if (topicName === t.history) {
        const list = JSON.parse(payload.toString()) as ChatMessage[]
        if (!Array.isArray(list)) return
        for (const msg of list) {
          if (!msg?.id) continue
          if (!messageStore.some((m) => m.id === msg.id)) messageStore.push(msg)
        }
        emitMessages()
        return
      }
      if (topicName !== t.messages) return
      const msg = JSON.parse(payload.toString()) as ChatMessage
      if (!msg?.id) return
      const idx = messageStore.findIndex((m) => m.id === msg.id)
      if (idx >= 0) messageStore[idx] = msg
      else messageStore.push(msg)
      if (messageStore.length > 100) messageStore.splice(0, messageStore.length - 100)
      emitMessages()
    } catch {
      /* ignore */
    }
  }
  c.on('message', handler)
  return () => {
    c.off('message', handler)
    messageListeners.delete(cb)
  }
}

export async function sendMessage(text: string, from: 'lana' | 'pc') {
  const c = client
  if (!c) throw new Error('Nicht verbunden')
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    text: text.trim(),
    from,
    createdAt: Date.now(),
    read: false,
  }
  messageStore.push(msg)
  emitMessages()
  c.publish(topics(roomId).messages, JSON.stringify(msg), { qos: 1, retain: false })
  publishHistory(c)
}

export async function markRead(ids: string[]) {
  // best-effort local mark; republish updated messages
  const c = client
  if (!c) return
  for (const id of ids) {
    const m = messageStore.find((x) => x.id === id)
    if (m && !m.read) {
      m.read = true
      c.publish(topics(roomId).messages, JSON.stringify(m), { qos: 1 })
    }
  }
  emitMessages()
}

/** Firebase leftovers — no longer required */
export function isConfigured(): boolean {
  return true
}

export function clearConfig() {
  /* no-op */
}

export function loadSavedConfig() {
  return null
}

export function saveConfig(_c: unknown) {
  /* no-op */
}
