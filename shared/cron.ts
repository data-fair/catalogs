import type { Scheduling } from '#api/types'

import { Cron } from 'croner'

export const toCRON = (scheduling: Scheduling): string => {
  const minute = scheduling.minute + (scheduling.minuteStep ? `/${scheduling.minuteStep}` : '')
  const hour = scheduling.hour + (scheduling.hourStep ? `/${scheduling.hourStep}` : '')
  const dayOfMonth = scheduling.lastDayOfMonth
    ? 'L'
    : scheduling.dayOfMonth + (scheduling.dayOfMonthStep ? `/${scheduling.dayOfMonthStep}` : '')
  const month = scheduling.month + (scheduling.monthStep ? `/${scheduling.monthStep}` : '')
  const dayOfWeek = scheduling.dayOfWeek
  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`
}

export const getNextImportDate = (schedulings: Scheduling[]) => {
  let nextDate = null
  for (const scheduling of schedulings) {
    const cron = toCRON(scheduling)
    const job = new Cron(cron, { timezone: scheduling.timeZone })
    const nextDateCandidate = job.nextRun()
    if (nextDateCandidate && (!nextDate || nextDateCandidate < nextDate)) {
      nextDate = nextDateCandidate
    }
  }

  return nextDate?.toISOString()
}
