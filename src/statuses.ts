export type StatusKey =
  | 'online'
  | 'offline'
  | 'busy'
  | 'coding'
  | 'gaming'
  | 'alone'

export type StatusDef = {
  key: StatusKey
  label: string
  hint: string
  color: string
  glow: string
}

export const STATUSES: StatusDef[] = [
  {
    key: 'online',
    label: 'Online',
    hint: 'Erreichbar & da',
    color: '#3d9a6a',
    glow: 'rgba(61, 154, 106, 0.35)',
  },
  {
    key: 'offline',
    label: 'Offline',
    hint: 'Gerade nicht am PC',
    color: '#6b7280',
    glow: 'rgba(107, 114, 128, 0.25)',
  },
  {
    key: 'busy',
    label: 'Beschäftigt',
    hint: 'Kurz später melden',
    color: '#c47a2c',
    glow: 'rgba(196, 122, 44, 0.3)',
  },
  {
    key: 'coding',
    label: 'Am Coden',
    hint: 'Im Flow — lieber schreiben',
    color: '#2f6f8f',
    glow: 'rgba(47, 111, 143, 0.35)',
  },
  {
    key: 'gaming',
    label: 'Am Zocken',
    hint: 'In-Game, Pop-ups an',
    color: '#1f8a7a',
    glow: 'rgba(31, 138, 122, 0.3)',
  },
  {
    key: 'alone',
    label: 'Brauche allein Zeit',
    hint: 'Bitte Raum lassen',
    color: '#8b4a5a',
    glow: 'rgba(139, 74, 90, 0.3)',
  },
]

export function statusByKey(key: string | undefined): StatusDef {
  return STATUSES.find((s) => s.key === key) ?? STATUSES[0]
}
