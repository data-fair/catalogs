import { test, expect } from '@playwright/test'
import { summarizeLogs, formatRemoteListing } from '../../../ui/src/utils/agent-state.ts'

test.describe('agent state helpers', () => {
  test('summarizeLogs keeps the last problems and messages, without task logs', () => {
    const logs = [
      { type: 'step', date: '2026-01-01', msg: 'Download' },
      { type: 'task', date: '2026-01-01', msg: 'progress', key: 'dl' },
      { type: 'warning', date: '2026-01-01', msg: 'Missing license' },
      { type: 'error', date: '2026-01-01', msg: 'x'.repeat(300) }
    ] as any
    const summary = summarizeLogs(logs)
    expect(summary.lastMessages).toEqual(['Download', 'Missing license', 'x'.repeat(200) + '…'])
    expect(summary.problems).toEqual(['warning: Missing license', 'error: ' + 'x'.repeat(200) + '…'])
    expect(summarizeLogs(undefined)).toEqual({ problems: [], lastMessages: [] })
  })

  test('formatRemoteListing describes the folder, its items and the imported ones', () => {
    const text = formatRemoteListing({
      count: 2,
      path: [{ id: 'f1', title: 'Transport' }],
      results: [
        { id: 'f2', title: 'Bus', type: 'folder' },
        { id: 'r1', title: 'Stops', type: 'resource', format: 'csv', updatedAt: '2026-03-04T10:00:00Z' }
      ]
    }, { page: 1, isImported: id => id === 'r1' })
    expect(text).toBe([
      'Current folder: Transport (folderId: `f1`)',
      '2 items (page 1)',
      '- [folder] Bus (id: `f2`)',
      '- [resource] Stops (id: `r1`) — csv, updated 2026-03-04 — already imported'
    ].join('\n'))
    expect(formatRemoteListing({ results: [] })).toBe('Current folder: root\n0 items')
  })
})
