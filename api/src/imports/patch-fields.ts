import { resolvedSchema as importSchema } from '#types/import/index.ts'

// the parts of an import a PATCH may change, by scope tier: the admin tier also gives the import
// away (owner) or points it at another data-fair dataset, that the next run overwrites
export const importPatchFields = {
  write: ['config', 'isSchedulingActive', 'shouldUpdateMetadata', 'shouldUpdateSchema', 'scheduling', 'status'],
  admin: ['owner', 'dataFairDataset', 'separator']
} as const

const properties: Record<string, { readOnly?: boolean }> = importSchema.properties

// the editable properties of the import schema, plus the owner (its route checks the new owner) and
// the status (only to 'waiting', checked by the route); every property in admin mode
export const patchableImportFields = (adminMode: boolean): string[] => Object.keys(properties)
  .filter(k => adminMode || !properties[k].readOnly || k === 'owner' || k === 'status')
