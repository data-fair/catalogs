import type { Log } from '@data-fair/types-catalogs'

const MSG_MAX_CHARS = 200

const clip = (msg: string) => msg.length > MSG_MAX_CHARS ? msg.slice(0, MSG_MAX_CHARS) + '…' : msg

export const summarizeLogs = (logs: Log[] | undefined, max = 5) => {
  const visible = (logs ?? []).filter(l => l.type !== 'task')
  return {
    problems: visible.filter(l => l.type === 'error' || l.type === 'warning').slice(-max).map(l => `${l.type}: ${clip(l.msg)}`),
    lastMessages: visible.slice(-max).map(l => clip(l.msg))
  }
}

export interface RemoteItem {
  id: string
  title: string
  type: 'folder' | 'resource'
  format?: string
  size?: number
  updatedAt?: string
}

export interface RemoteListing {
  count?: number
  results: RemoteItem[]
  path?: { id: string, title: string }[]
}

export const formatRemoteListing = (listing: RemoteListing, opts: { page?: number, isImported?: (id: string) => boolean } = {}) => {
  const path = listing.path?.length
    ? listing.path.map(p => `${p.title} (folderId: \`${p.id}\`)`).join(' > ')
    : 'root'
  const lines = [
    `Current folder: ${path}`,
    `${listing.count ?? listing.results.length} items${opts.page ? ` (page ${opts.page})` : ''}`
  ]
  for (const item of listing.results) {
    const details = [item.format, item.updatedAt && `updated ${item.updatedAt.slice(0, 10)}`].filter(Boolean)
    let line = `- [${item.type}] ${item.title} (id: \`${item.id}\`)`
    if (details.length) line += ` — ${details.join(', ')}`
    if (item.type === 'resource' && opts.isImported?.(item.id)) line += ' — already imported'
    lines.push(line)
  }
  return lines.join('\n')
}
