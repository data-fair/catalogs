import { test, expect } from '@playwright/test'
import { fetchAllPages } from '../../../ui/src/utils/registry-pages.ts'

// The catalogs list and the creation page read the registry's catalog plugins with `size=100`, the registry's cap: a
// plugin past the 100th was missing, and its catalogs read as "deleted". They now read every page.

test.describe('reading every page of a registry list', () => {
  test('reads past the registry cap of 100 until count is reached', async () => {
    const items = Array.from({ length: 230 }, (_, i) => i)
    const skips: number[] = []
    const all = await fetchAllPages(async skip => {
      skips.push(skip)
      return { results: items.slice(skip, skip + 100), count: items.length }
    })
    expect(all).toEqual(items)
    expect(skips).toEqual([0, 100, 200])
  })

  test('stops on an empty page even if count says more', async () => {
    let calls = 0
    const all = await fetchAllPages(async () => {
      calls++
      return { results: calls === 1 ? [1, 2] : [], count: 10 }
    })
    expect(all).toEqual([1, 2])
    expect(calls).toBe(2)
  })
})
