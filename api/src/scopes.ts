// The OAuth-style scope vocabulary catalogs declares: the catalogs family with read, write and admin
// tiers and its bare umbrella, plus the global tier scopes all:read / all:write / all:admin shared by
// every service of the platform. Every session-facing route is listed in scopedOperations and guarded
// by requireOperationScope; any other route refuses scope-restricted sessions (lib-express).
// The OpenAPI document (api/contract/api-docs.ts) is built from the same table.
//
// The worker reaches data-fair with its own API key in the name of the owner: a catalogs scope is
// enough to create datasets through imports and to send datasets outside through publications,
// without any data-fair datasets scope. The descriptions say so.
import type { RequestHandler } from 'express'
import type { ScopeTier } from '@data-fair/lib-common-types/scopes.js'
import { defineScopes } from '@data-fair/lib-common-types/scopes.js'
import { requireScope } from '@data-fair/lib-express/index.js'

export const vocabulary = defineScopes({
  catalogs: {
    tiers: ['read', 'write', 'admin'],
    descriptions: {
      umbrella: { fr: 'Tous les droits sur les catalogues', en: 'All catalogs scopes' },
      read: {
        fr: 'Lire les catalogues du compte, parcourir leurs ressources distantes, lire les imports et les publications et leurs journaux',
        en: "Read the account's catalogs, browse their remote resources, read imports and publications and their logs"
      },
      write: {
        fr: 'Créer, configurer et relancer les imports et les publications. Un import crée et écrase des jeux de données du compte dans data-fair, une publication envoie des jeux de données du compte et leurs métadonnées vers des catalogues extérieurs, sans autre droit data-fair',
        en: 'Create, configure and re-run imports and publications. An import creates and overwrites datasets of the account in data-fair, a publication sends datasets of the account and their metadata to outside catalogs, with no other data-fair right'
      },
      admin: {
        fr: 'Connecter le compte à des catalogues extérieurs et stocker leurs identifiants, changer les propriétaires, supprimer catalogues, imports et publications, y compris sur les catalogues distants',
        en: 'Connect the account to outside catalogs and store their credentials, change owners, delete catalogs, imports and publications, including on the remote catalogs'
      }
    }
  }
})
export const { acceptedScopes, scopeDescriptions } = vocabulary
export type ScopeFamily = typeof vocabulary.families[number]

export type ScopedOperation = { method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string, family: ScopeFamily, tier: ScopeTier }

// paths are relative to /api, as in the OpenAPI document
export const scopedOperations = {
  listCatalogs: { method: 'get', path: '/catalogs', family: 'catalogs', tier: 'read' },
  getCatalog: { method: 'get', path: '/catalogs/{id}', family: 'catalogs', tier: 'read' },
  listCatalogResources: { method: 'get', path: '/catalogs/{id}/resources', family: 'catalogs', tier: 'read' },
  getCatalogConfiguration: { method: 'get', path: '/catalogs/{id}/configuration', family: 'catalogs', tier: 'read' },
  getCatalogConfigurationSchema: { method: 'get', path: '/catalogs/{id}/configuration-schema', family: 'catalogs', tier: 'read' },
  getPlugin: { method: 'get', path: '/plugins/{id}', family: 'catalogs', tier: 'read' },
  listImports: { method: 'get', path: '/imports', family: 'catalogs', tier: 'read' },
  getImport: { method: 'get', path: '/imports/{id}', family: 'catalogs', tier: 'read' },
  getImportConfiguration: { method: 'get', path: '/imports/{id}/configuration', family: 'catalogs', tier: 'read' },
  getImportConfigurationSchema: { method: 'get', path: '/imports/{id}/configuration-schema', family: 'catalogs', tier: 'read' },
  listPublications: { method: 'get', path: '/publications', family: 'catalogs', tier: 'read' },
  getPublication: { method: 'get', path: '/publications/{id}', family: 'catalogs', tier: 'read' },
  postImport: { method: 'post', path: '/imports', family: 'catalogs', tier: 'write' },
  // the admin fields of the body (owner, dataFairDataset, separator) also need the admin tier, checked by the route
  patchImport: { method: 'patch', path: '/imports/{id}', family: 'catalogs', tier: 'write' },
  putImportConfiguration: { method: 'put', path: '/imports/{id}/configuration', family: 'catalogs', tier: 'write' },
  postPublication: { method: 'post', path: '/publications', family: 'catalogs', tier: 'write' },
  rerunPublication: { method: 'post', path: '/publications/{id}', family: 'catalogs', tier: 'write' },
  postCatalog: { method: 'post', path: '/catalogs', family: 'catalogs', tier: 'admin' },
  patchCatalog: { method: 'patch', path: '/catalogs/{id}', family: 'catalogs', tier: 'admin' },
  putCatalogConfiguration: { method: 'put', path: '/catalogs/{id}/configuration', family: 'catalogs', tier: 'admin' },
  deleteCatalog: { method: 'delete', path: '/catalogs/{id}', family: 'catalogs', tier: 'admin' },
  deleteImport: { method: 'delete', path: '/imports/{id}', family: 'catalogs', tier: 'admin' },
  deletePublication: { method: 'delete', path: '/publications/{id}', family: 'catalogs', tier: 'admin' }
} satisfies Record<string, ScopedOperation>

export type ScopedOperationId = keyof typeof scopedOperations

// generic over the route params so that, mounted in front of a handler, it keeps express's inference of
// the path params (req.params.id: string)
export const requireOperationScope = <P = Record<string, string>>(operationId: ScopedOperationId): RequestHandler<P> => {
  const operation: ScopedOperation | undefined = scopedOperations[operationId]
  if (!operation) throw new Error(`unknown scoped operation ${operationId}`)
  return requireScope(acceptedScopes(operation.family, operation.tier)) as unknown as RequestHandler<P>
}
