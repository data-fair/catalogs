/**
 * The OpenAPI document of this service, served at /catalogs/api/api-docs.json.
 *
 * It is public and origin independent: data-fair fetches it over a private url and merges it into its
 * platform document (paths under /catalogs/api, tools and skills prefixed catalogs_), so agents of the
 * deployment can connect catalogs, import and publish datasets and follow the runs through
 * `@data-fair/openapi-mcp`.
 *
 * Every operation is an entry of scopedOperations (api/src/scopes.ts): the oauth2 scheme declares the
 * scopes catalogs enforces, and each operation lists every scope it accepts as its own security
 * alternative (standard OpenAPI: the scopes of one requirement are all needed). Edit the table, not
 * this document, to add or move an operation.
 */
import { oauth2SecurityScheme, oauth2Alternatives, type ScopeLocale } from '@data-fair/lib-common-types/scopes.js'
import { resolvedSchema as catalogSchema } from '#types/catalog/index.ts'
import { resolvedSchema as importSchema } from '#types/import/index.ts'
import { resolvedSchema as publicationSchema } from '#types/publication/index.ts'
import pluginSchema from '#types/plugin/schema.ts'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import catalogsGetReq from '../doc/catalogs/get-req/schema.ts'
import importsGetReq from '../doc/imports/get-req/schema.ts'
import publicationsGetReq from '../doc/publications/get-req/schema.ts'
import { vocabulary, acceptedScopes, scopedOperations, type ScopedOperationId } from '../src/scopes.ts'
import { importPatchFields } from '../src/imports/patch-fields.ts'

// the resolved schemas as OpenAPI components: no $id, no build annotations, no vjsf layout (its
// context urls are the UI's)
const strip = (value: any): any => {
  if (Array.isArray(value)) return value.map(strip)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([k]) => !['$id', 'x-exports', 'layout'].includes(k))
      .map(([k, v]) => [k, strip(v)]))
  }
  return value
}
const component = (schema: Record<string, any>) => {
  const { $defs, ...rest } = strip(schema)
  return rest
}
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })

const pluginConfig = (description: string) => ({ type: 'object', description })

const catalogComponent = component(catalogSchema)
// ciphered, never returned
delete catalogComponent.properties.secrets
catalogComponent.required = catalogComponent.required?.filter((k: string) => k !== 'secrets')
catalogComponent.properties.config = pluginConfig('The config of the plugin of the catalog, its schema is returned by getCatalogConfigurationSchema. Secret fields are masked.')

const importComponent = component(importSchema)
importComponent.properties.config = pluginConfig('The import config of the plugin, its schema is returned by getImportConfigurationSchema (only for catalogs with the importConfig capability).')

const publicationComponent = component(publicationSchema)

const pluginComponent = component(pluginSchema)
pluginComponent.properties.metadata = { type: 'object', description: 'The metadata of the plugin: title, description, capabilities (import, publication, search, pagination, importConfig, requiresPublicationSite...).' }

const json = (description: string, schema: Record<string, any>) => ({ description, content: { 'application/json': { schema } } })
const body = (schema: Record<string, any>) => ({ required: true, content: { 'application/json': { schema } } })
const idParam = (description: string) => ({ in: 'path', name: 'id', required: true, description, schema: { type: 'string' } })
const page = (items: Record<string, any>, extra: Record<string, any> = {}) => ({
  type: 'object', properties: { count: { type: 'integer' }, results: { type: 'array', items }, ...extra }
})

const queryDescriptions: Record<string, string> = {
  size: 'Number of results per page.',
  page: 'Page number, starting at 1.',
  skip: 'Number of results to skip.',
  showAll: 'true to list the documents of every account (superadmin only).',
  sort: 'Sort keys, comma separated, as key:1 or key:-1 (e.g. updated.date:-1).',
  select: 'Fields to return, comma separated.',
  q: 'Full text search.',
  owners: 'Owners, comma separated, as type:id or type:id:department (with showAll).',
  plugins: 'Plugin ids, comma separated.',
  capabilities: 'Capabilities the catalogs must have, comma separated (e.g. import,publication).',
  catalogId: 'Id of the catalog.',
  dataFairDatasetId: 'Id of the data-fair dataset.'
}
const queryParams = (schema: { properties: Record<string, any> }) => Object.entries(schema.properties).map(([name, s]) => ({
  in: 'query', name, required: false, description: queryDescriptions[name] ?? s.description, schema: { type: s.type }
}))

// a property of a request body: readOnly marks what the server writes, clients leave it out of requests
const writable = ({ readOnly, ...property }: Record<string, any>) => property
const pick = (properties: Record<string, any>, keys: readonly string[]) => Object.fromEntries(keys.map(k => [k, writable(properties[k])]))

// the bodies of the POST routes, as api/doc/*/post-req pick them, from the resolved schemas
const postBody = (schema: Record<string, any>, keys: string[], overrides: Record<string, any> = {}) => {
  const { title, ...picked } = component(jsonSchema(schema).pickProperties(keys).schema)
  return { ...picked, properties: { ...pick(picked.properties, keys), ...overrides } }
}

const catalogConfiguration = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'config'],
  properties: {
    title: catalogComponent.properties.title,
    description: catalogComponent.properties.description,
    config: catalogComponent.properties.config
  }
}
const importConfigurationKeys = ['config', 'isSchedulingActive', 'shouldUpdateMetadata', 'shouldUpdateSchema', 'scheduling'] as const
const importConfiguration = {
  type: 'object',
  additionalProperties: false,
  properties: pick(importComponent.properties, importConfigurationKeys)
}

const remoteListing = {
  type: 'object',
  properties: {
    count: { type: 'integer', description: 'The number of items of the folder.' },
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          type: { type: 'string', enum: ['folder', 'resource'] },
          description: { type: 'string' },
          format: { type: 'string' },
          updatedAt: { type: 'string' }
        }
      }
    },
    path: { type: 'array', description: 'The folders from the root to the listed one.', items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' } } } }
  }
}

type Operation = Record<string, any> & { tags: string[] }
const operations: Record<ScopedOperationId, Operation> = {
  listCatalogs: {
    summary: 'List catalogs',
    description: 'List the catalogs of the active account (the remote catalogs it is connected to), with the number of imports and publications of each and facets on their plugins and capabilities.',
    tags: ['catalogs'],
    parameters: queryParams(catalogsGetReq),
    responses: { 200: json('A page of catalogs.', page(ref('catalog'), { facets: { type: 'object' } })) }
  },
  postCatalog: {
    summary: 'Connect a catalog',
    description: 'Connect the account to a remote catalog through a catalog plugin. The config follows the configSchema of the plugin (getPlugin); its secret fields are ciphered and masked. The owner defaults to the active account.',
    tags: ['catalogs'],
    requestBody: body(postBody(catalogSchema, ['title', 'description', 'plugin', 'owner', 'config'], {
      config: pluginConfig('The config of the catalog, it follows the configSchema of the plugin (getPlugin).')
    })),
    responses: { 201: json('The created catalog.', ref('catalog')) }
  },
  getCatalog: {
    summary: 'Read a catalog',
    description: 'A catalog, its plugin, capabilities and config (secret fields masked).',
    tags: ['catalogs'],
    parameters: [idParam('Id of the catalog.')],
    responses: { 200: json('The catalog.', ref('catalog')) }
  },
  patchCatalog: {
    summary: 'Update a catalog',
    description: 'Update the title, description, config or owner of a catalog. A new owner also becomes the owner of its imports and publications. A null value removes a part.',
    tags: ['catalogs'],
    parameters: [idParam('Id of the catalog.')],
    requestBody: body({ type: 'object', properties: pick(catalogComponent.properties, ['title', 'description', 'config', 'owner']) }),
    responses: { 200: json('The updated catalog.', ref('catalog')) }
  },
  deleteCatalog: {
    summary: 'Delete a catalog',
    description: 'Delete a catalog and its imports (the imported datasets are kept). The links of its publications are removed, or with deletePublications=true the published datasets are also deleted from the remote catalog.',
    tags: ['catalogs'],
    parameters: [
      idParam('Id of the catalog.'),
      { in: 'query', name: 'deletePublications', required: false, description: 'true to also delete the published datasets from the remote catalog.', schema: { type: 'boolean' } }
    ],
    responses: { 204: { description: 'The catalog is deleted, or marked for deletion until its publications are deleted.' } }
  },
  listCatalogResources: {
    summary: 'Browse a remote catalog',
    description: 'List the folders and resources of the remote catalog, one folder at a time. q needs the search capability of the catalog, page and size the pagination capability.',
    tags: ['catalogs'],
    parameters: [
      idParam('Id of the catalog.'),
      { in: 'query', name: 'currentFolderId', required: false, description: 'Folder to list, the root of the catalog when omitted.', schema: { type: 'string' } },
      { in: 'query', name: 'q', required: false, description: 'Full text search (search capability).', schema: { type: 'string' } },
      { in: 'query', name: 'page', required: false, description: 'Page number (pagination capability).', schema: { type: 'integer' } },
      { in: 'query', name: 'size', required: false, description: 'Results per page (pagination capability).', schema: { type: 'integer' } }
    ],
    responses: { 200: json('The content of the folder.', remoteListing) }
  },
  getCatalogConfiguration: {
    summary: 'Read the configuration of a catalog',
    description: 'Its title, description and plugin config, secret fields masked, as saved by putCatalogConfiguration.',
    tags: ['catalogs'],
    parameters: [idParam('Id of the catalog.')],
    responses: { 200: json('The configuration.', ref('catalogConfiguration')) }
  },
  getCatalogConfigurationSchema: {
    summary: 'Read the configuration schema of a catalog',
    description: 'The JSON schema of the configuration, with the config schema of the plugin, in json-layout syntax with its context resolved.',
    tags: ['catalogs'],
    parameters: [idParam('Id of the catalog.')],
    responses: { 200: json('A JSON schema.', { type: 'object' }) }
  },
  putCatalogConfiguration: {
    summary: 'Replace the configuration of a catalog',
    description: 'Replace the title, description and plugin config. A masked secret field sent back as read keeps the stored secret; a new value replaces it. A missing description is removed.',
    tags: ['catalogs'],
    parameters: [idParam('Id of the catalog.')],
    requestBody: body(ref('catalogConfiguration')),
    responses: { 200: json('The saved configuration.', ref('catalogConfiguration')) }
  },
  getPlugin: {
    summary: 'Read a catalog plugin',
    description: 'The metadata of a catalog plugin (capabilities, title) and its schemas: configSchema for the catalog config, importConfigSchema for the import config.',
    tags: ['plugins'],
    parameters: [idParam('Id of the plugin (the plugin of a catalog).')],
    responses: { 200: json('The plugin.', ref('plugin')) }
  },
  listImports: {
    summary: 'List imports',
    description: 'List the imports of the active account, most recently run first. Logs are not included.',
    tags: ['imports'],
    parameters: queryParams(importsGetReq),
    responses: { 200: json('A page of imports.', page(ref('import'))) }
  },
  postImport: {
    summary: 'Import a remote resource',
    description: 'Import a resource of a remote catalog (listCatalogResources) as a data-fair dataset of the owner of the catalog. The worker runs it within seconds. With dataFairDataset the import overwrites that existing dataset, and replaces the import that pointed to it.',
    tags: ['imports'],
    requestBody: body(postBody(importSchema, ['catalog', 'dataFairDataset', 'separator', 'remoteResource', 'scheduling', 'config', 'isSchedulingActive', 'shouldUpdateMetadata', 'shouldUpdateSchema'], {
      config: pluginConfig('The import config, it follows the importConfigSchema of the plugin (getPlugin) when the catalog has the importConfig capability, {} otherwise.')
    })),
    responses: { 201: json('The created import, waiting for the worker.', ref('import')) }
  },
  getImport: {
    summary: 'Read an import',
    description: 'An import with its status, the dates of its last and next runs, its dataset and the logs of its last run.',
    tags: ['imports'],
    parameters: [idParam('Id of the import.')],
    responses: { 200: json('The import.', ref('import')) }
  },
  patchImport: {
    summary: 'Update an import',
    description: `Update some parts of an import; status: waiting runs it again now. ${importPatchFields.admin.join(', ')} need the admin tier of the catalogs scopes. A null value removes a part.`,
    tags: ['imports'],
    parameters: [idParam('Id of the import.')],
    requestBody: body({ type: 'object', properties: pick(importComponent.properties, [...importPatchFields.write, ...importPatchFields.admin]) }),
    responses: { 200: json('The updated import.', ref('import')) }
  },
  deleteImport: {
    summary: 'Delete an import',
    description: 'Delete an import, the imported dataset is kept.',
    tags: ['imports'],
    parameters: [idParam('Id of the import.')],
    responses: { 204: { description: 'The import is deleted.' } }
  },
  getImportConfiguration: {
    summary: 'Read the configuration of an import',
    description: 'Its scheduling, update options and plugin import config, as saved by putImportConfiguration.',
    tags: ['imports'],
    parameters: [idParam('Id of the import.')],
    responses: { 200: json('The configuration.', ref('importConfiguration')) }
  },
  getImportConfigurationSchema: {
    summary: 'Read the configuration schema of an import',
    description: 'The JSON schema of the configuration, with the import config schema of the plugin when the catalog has the importConfig capability, in json-layout syntax with its context resolved.',
    tags: ['imports'],
    parameters: [idParam('Id of the import.')],
    responses: { 200: json('A JSON schema.', { type: 'object' }) }
  },
  putImportConfiguration: {
    summary: 'Replace the configuration of an import',
    description: 'Replace the scheduling, update options and plugin import config. A missing optional part is removed; config is refused when the catalog has no importConfig capability.',
    tags: ['imports'],
    parameters: [idParam('Id of the import.')],
    requestBody: body(ref('importConfiguration')),
    responses: { 200: json('The saved configuration.', ref('importConfiguration')) }
  },
  listPublications: {
    summary: 'List publications',
    description: 'List the publications of datasets of the active account to remote catalogs. Logs are not included.',
    tags: ['publications'],
    parameters: queryParams(publicationsGetReq),
    responses: { 200: json('A page of publications.', page(ref('publication'))) }
  },
  postPublication: {
    summary: 'Publish a dataset',
    description: 'Publish a data-fair dataset of the account and its metadata to a remote catalog, as a new folder or resource or replacing an existing one (action, allowed by the capabilities of the catalog). Catalogs with the requiresPublicationSite capability need the publication site the remote dataset links to. The worker runs it within seconds.',
    tags: ['publications'],
    requestBody: body(postBody(publicationSchema, ['catalog', 'action', 'dataFairDataset', 'publicationSite', 'remoteFolder', 'remoteResource'])),
    responses: {
      201: json('The created publication, waiting for the worker.', ref('publication')),
      409: { description: 'The dataset is already published to this catalog.' }
    }
  },
  getPublication: {
    summary: 'Read a publication',
    description: 'A publication with its status, the date of its last run, the remote folder or resource and the logs of its last run.',
    tags: ['publications'],
    parameters: [idParam('Id of the publication.')],
    responses: { 200: json('The publication.', ref('publication')) }
  },
  rerunPublication: {
    summary: 'Publish again',
    description: 'Run the publication again now, sending the current dataset and metadata to the remote catalog.',
    tags: ['publications'],
    parameters: [idParam('Id of the publication.')],
    responses: { 204: { description: 'The publication is waiting for the worker.' } }
  },
  deletePublication: {
    summary: 'Delete a publication',
    description: 'Delete the published dataset from the remote catalog, then the publication; with onlyLink=true only the publication is deleted and the remote dataset is kept.',
    tags: ['publications'],
    parameters: [
      idParam('Id of the publication.'),
      { in: 'query', name: 'onlyLink', required: false, description: 'true to keep the dataset in the remote catalog.', schema: { type: 'boolean' } }
    ],
    responses: { 204: { description: 'The publication is deleted, or waiting for the worker to delete the remote dataset.' } }
  }
}

const tagTitles = {
  catalogs: { fr: 'Catalogues', en: 'Catalogs' },
  imports: { fr: 'Imports', en: 'Imports' },
  publications: { fr: 'Publications', en: 'Publications' },
  plugins: { fr: 'Plugins', en: 'Plugins' }
}

const infos = {
  fr: {
    title: 'API Catalogues',
    description: 'Connexion du compte à des catalogues de données extérieurs, import de leurs ressources comme jeux de données data-fair et publication de jeux de données data-fair vers ces catalogues.'
  },
  en: {
    title: 'API Catalogs',
    description: 'Connect the account to outside data catalogs, import their resources as data-fair datasets and publish data-fair datasets to them.'
  }
}

// the security of an operation: the cookie session, or a token holding one of the scopes it accepts
const operationSecurity = (operationId: ScopedOperationId) => {
  const { family, tier } = scopedOperations[operationId]
  return [{ sdCookie: [] }, ...oauth2Alternatives(acceptedScopes(family, tier))]
}

export default (locale: ScopeLocale = 'fr') => {
  const paths: Record<string, Record<string, any>> = {}
  for (const [operationId, { method, path }] of Object.entries(scopedOperations)) {
    const operation = operations[operationId as ScopedOperationId]
    paths[path] = paths[path] ?? {}
    paths[path][method] = {
      operationId,
      ...operation,
      tags: operation.tags.map(tag => tagTitles[tag as keyof typeof tagTitles][locale]),
      security: operationSecurity(operationId as ScopedOperationId)
    }
  }
  return {
    openapi: '3.1.0',
    info: { ...infos[locale], version: '1.0.0' },
    // no request origin: data-fair fetches this document over a private url and prefixes the paths itself
    servers: [{ url: '/catalogs/api' }],
    components: {
      securitySchemes: {
        sdCookie: { type: 'apiKey', in: 'cookie', name: 'id_token' },
        // relative token url, data-fair sets the one of each site
        oauth2: oauth2SecurityScheme(vocabulary, { directoryUrl: '/simple-directory', locale })
      },
      schemas: {
        catalog: catalogComponent,
        catalogConfiguration,
        import: importComponent,
        importConfiguration,
        publication: publicationComponent,
        plugin: pluginComponent
      }
    },
    security: [{ sdCookie: [] }],
    tags: Object.values(tagTitles).map(t => ({ name: t[locale] })),
    paths
  }
}
