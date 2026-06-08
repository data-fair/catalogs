import type { Import, Publication } from '#api/types'
import { internalError } from '@data-fair/lib-node/observer.js'

/** internalError prefixed with `[catalog:<id>][<type>:<id>]`. Keep `code` low-cardinality: no ids (they go in the message). */
export const taskInternalError = (
  task: Import | Publication,
  type: 'import' | 'publication',
  code: string,
  description: string,
  error?: any
) => {
  const msg = `[catalog:${task.catalog.id}][${type}:${task._id}] ${description}`
  if (error === undefined) internalError(code, msg)
  else internalError(code, msg, error)
}
