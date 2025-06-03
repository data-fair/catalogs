import type { Scheduling } from '#api/types'

import { CronJob } from 'cron'

export const toCRON = (scheduling: Scheduling): string => {
  const minute = scheduling.minute + (scheduling.minuteStep ? `/${scheduling.minuteStep}` : '')
  const hour = scheduling.hour + (scheduling.hourStep ? `/${scheduling.hourStep}` : '')
  const dayOfMonth = scheduling.dayOfMonth + (scheduling.dayOfMonthStep ? `/${scheduling.dayOfMonthStep}` : '')
  const month = scheduling.month + (scheduling.monthStep ? `/${scheduling.monthStep}` : '')
  const dayOfWeek = scheduling.dayOfWeek
  return `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`
}

export const getNextImportDate = (schedulings: Scheduling[]) => {
  let nextDate = null
  for (const scheduling of schedulings) {
    const cron = toCRON(scheduling)
    const job = new CronJob(cron, () => { }, () => { }, false, scheduling.timeZone)
    const nextDateCandidate = job.nextDate()?.toJSDate()
    if (!nextDate || nextDateCandidate < nextDate) {
      nextDate = nextDateCandidate
    }
  }

  return nextDate?.toISOString()
}
