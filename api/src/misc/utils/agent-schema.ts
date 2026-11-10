import type { Account } from '@data-fair/lib-express'
import { utcs } from '@data-fair/catalogs-shared/utcs.ts'

export type AgentSchemaContext = {
  owner: Account
  catalogConfig?: Record<string, any>
  resourceId?: string
}

const placeholder = /\$?\{context\.([\w.]+)\}/g

// A vjsf schema (catalog config, import config, scheduling) as an agent editor (openapi-mcp) consumes
// it: the editor passes no vjsf context, so the context the UI gives vjsf is resolved in place.
// - ${context.x} (js templates) and {context.x} (native layouts) are replaced by the scalar value of
//   context.x; origin is '' so that urls stay relative to the site, the way the platform tools call
//   the other services; unknown placeholders are left as they are
// - getItems: 'context.utcs' becomes the static list of time zones
// Returns a deep copy, the input is not mutated.
export const agentSchema = (schema: Record<string, any>, context: AgentSchemaContext): Record<string, any> => {
  const { owner } = context
  const values: Record<string, any> = {
    origin: '',
    ownerFilter: `${owner.type}:${owner.id}${owner.department ? ':' + owner.department : ''}`,
    owner: { type: owner.type, id: owner.id, department: owner.department ?? '' },
    resourceId: context.resourceId,
    catalogConfig: context.catalogConfig ?? {}
  }
  const lookup = (path: string): string | undefined => {
    let value: any = values
    for (const key of path.split('.')) value = value?.[key]
    return ['string', 'number', 'boolean'].includes(typeof value) ? String(value) : undefined
  }
  const resolve = (value: any): any => {
    if (typeof value === 'string') return value.replace(placeholder, (match, path) => lookup(path) ?? match)
    if (Array.isArray(value)) return value.map(resolve)
    if (value && typeof value === 'object') {
      const resolved: Record<string, any> = {}
      for (const [k, v] of Object.entries(value)) {
        if (k === 'getItems' && v === 'context.utcs') resolved.items = [...utcs]
        else resolved[k] = resolve(v)
      }
      return resolved
    }
    return value
  }
  return resolve(schema)
}
