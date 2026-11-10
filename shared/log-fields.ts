// Log fields shared by the api and the worker (see the "Logging" section of AGENTS.md).
// The actor (accountKey, userId...) comes from the implicit log context opened by session.middleware();
// the owner of a catalog, import or publication is a different notion and uses the owner* names, as in data-fair.
// Config-free on purpose: only plain values.

export type OwnerLike = { type: string, id: string, name?: string, department?: string }

export type OwnerLogFields = { ownerKey: string, ownerDep: string | undefined, ownerName: string | undefined }

// the 3 keys are always present, possibly undefined: pino drops undefined values from the line
export const ownerLogFields = (owner: OwnerLike): OwnerLogFields => ({
  ownerKey: owner.type + '.' + owner.id,
  ownerDep: owner.department || undefined,
  ownerName: owner.name || undefined
})

export type TaskType = 'import' | 'publication'

type TaskLike = { _id: string, catalog: { id: string }, owner: OwnerLike }

export type TaskLogFields = OwnerLogFields & { catalogId: string, taskType: TaskType, importId?: string, publicationId?: string }

/** fields of every line about an import or a publication, opened as log context by the worker for the whole task */
export const taskLogFields = (task: TaskLike, type: TaskType): TaskLogFields => ({
  catalogId: task.catalog.id,
  taskType: type,
  [type === 'import' ? 'importId' : 'publicationId']: task._id,
  ...ownerLogFields(task.owner)
})
