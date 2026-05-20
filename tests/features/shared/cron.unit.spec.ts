import { test, expect } from '@playwright/test'
import { toCRON, getNextImportDate } from '../../../shared/cron.ts'

const monthly = { type: 'monthly', minute: 0, hour: 0, dayOfMonth: 1, month: '*', dayOfWeek: '*' } as any

test.describe('toCRON', () => {
  test('builds a plain 5-field cron expression', () => {
    expect(toCRON(monthly)).toBe('0 0 1 * *')
  })

  test('applies step suffixes when *Step fields are set', () => {
    const stepped = {
      minute: 0,
      minuteStep: 5,
      hour: 2,
      hourStep: 3,
      dayOfMonth: 1,
      dayOfMonthStep: 2,
      month: 1,
      monthStep: 4,
      dayOfWeek: '*'
    } as any
    expect(toCRON(stepped)).toBe('0/5 2/3 1/2 1/4 *')
  })

  test('uses "L" for the last day of the month', () => {
    const lastDay = { minute: 30, hour: 6, lastDayOfMonth: true, month: '*', dayOfWeek: '*' } as any
    expect(toCRON(lastDay)).toBe('30 6 L * *')
  })
})

test.describe('getNextImportDate', () => {
  test('returns undefined for an empty list of schedulings', () => {
    expect(getNextImportDate([])).toBeUndefined()
  })

  test('returns a valid future ISO date for a scheduling', () => {
    const next = getNextImportDate([monthly])
    expect(typeof next).toBe('string')
    const nextDate = new Date(next as string)
    expect(Number.isNaN(nextDate.getTime())).toBe(false)
    expect(nextDate.getTime()).toBeGreaterThan(Date.now())
  })

  test('returns the earliest date across several schedulings', () => {
    const daily = { type: 'daily', minute: 0, hour: 0, dayOfMonth: '*', month: '*', dayOfWeek: '*' } as any
    const next = getNextImportDate([monthly, daily])
    const earliest = [getNextImportDate([monthly]), getNextImportDate([daily])]
      .filter(Boolean)
      .sort()[0]
    expect(next).toBe(earliest)
  })
})
