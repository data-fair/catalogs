import type { LogFunctions, Log } from '@data-fair/types-catalogs'
import type { Import, Publication } from '#api/types'
import mongo from '#mongo'

import { emit as wsEmit } from '@data-fair/lib-node/ws-emitter.js'

type TaskKey = 'import' | 'publication'
type Task = Import | Publication

/**
 * Prepares the log functions context, which is used for writing logs during
 * the processing of an import or a publication.
 */
export default (task: Task, type: TaskKey): LogFunctions => {
  const collection = type === 'import' ? mongo.imports : mongo.publications

  const pushLog = async (log: Omit<Log, 'date'>) => {
    const logWithDate = { ...log, date: new Date().toISOString() } as Log
    await collection.updateOne({ _id: task._id }, { $push: { logs: logWithDate } })
    await wsEmit(`${type}/${task._id}/logs`, logWithDate)
  }

  return {
    info: async (msg, extra) => await pushLog({ type: 'info', msg, extra } as Omit<Log, 'date'>),
    warning: async (msg, extra) => await pushLog({ type: 'warning', msg, extra } as Omit<Log, 'date'>),
    error: async (msg, extra) => await pushLog({ type: 'error', msg, extra } as Omit<Log, 'date'>),
    step: async (msg) => await pushLog({ type: 'step', msg } as Omit<Log, 'date'>),
    task: async (key, msg, total) => await pushLog({ type: 'task', msg, key, progress: 0, total } as Omit<Log, 'date'>),
    progress: async (taskKey, progress, total) => {
      const progressDate = new Date().toISOString()
      await collection.updateOne({ _id: task._id, logs: { $elemMatch: { type: 'task', key: taskKey } } },
        { $set: { 'logs.$.progress': progress, 'logs.$.total': total, 'logs.$.progressDate': progressDate } })
      await wsEmit(`${type}/${task._id}/logs`, { type: 'task', key: taskKey, progressDate, progress, total })
    }
  }
}
