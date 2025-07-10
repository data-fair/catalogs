import type { Capability } from './capability/index.ts'
import type { Publication } from './publication/index.ts'
import type { LogFunctions } from './logs.d.ts'
import type { Includes } from './utils.ts'

/**
 * Context for preparing a catalog configuration.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @template TCapabilities - The capabilities of the catalog.
 * @property catalogConfig - The catalog configuration, that can contain secrets to extract.
 * @property capabilities - The actuals capabilities of the catalog.
 * @property secrets - The actuals deciphered secrets of the catalog, if any.
 */
export type PrepareContext<TCatalogConfig, TCapabilities extends Capability[]> = {
  /** The catalog configuration, that can contain secrets to extract */
  catalogConfig: TCatalogConfig,
  /** The actuals capabilities of the catalog */
  capabilities: TCapabilities,
  /** The actuals deciphered secrets of the catalog */
  secrets: Record<string, string>,
}

/**
 * Context for listing resources and folders in a catalog.
 *
 * @deprecated Use `ListResourcesContext` instead.
 */
export type ListContext<TCatalogConfig, TCapabilities extends Capability[]> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The specific parameters for listing resources */
  params: ListParams<TCapabilities>
}

/**
 * Context for listing resources and folders in a catalog.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @template TCapabilities - The capabilities of the catalog.
 * @property catalogConfig - The catalog configuration.
 * @property secrets - The deciphered secrets of the catalog.
 * @property params - The specific parameters for listing resources and folders.
 */
export type ListResourcesContext<TCatalogConfig, TCapabilities extends Capability[]> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The specific parameters for listing resources and folders */
  params: ListParams<TCapabilities>
}

/**
 * Parameters for listing resources in a catalog.
 * @template TCapabilities - The capabilities of the catalog.
 * @property currentFolderId - The ID of the current folder used to list subfolders and resources.
 * @property q - The search field to filter resources when the 'search' capability is included.
 * @property page - The page number for pagination when the 'pagination' capability is included.
 * @property size - The number of items per page for pagination when the 'pagination' capability is included.
 * @property others - Additional filters for the list method when the 'additionalFilters' capability is included.
 */
type ListParams<TCapabilities extends Capability[]> = {
  /** The current level folder is used to list subfolders and resources. */
  currentFolderId?: string
} &
  (Includes<TCapabilities, 'search'> extends true ? SearchParams : {}) &
  (Includes<TCapabilities, 'pagination'> extends true ? PaginationParams : {}) &
  (Includes<TCapabilities, 'additionalFilters'> extends true ? Record<string, string | number> : {})

/** The params q is used to search resources */
type SearchParams = { q?: string }
/** The params page and size are used for pagination */
type PaginationParams = {
  page?: number
  size?: number
}

/**
 * Context for get and downloading a resource.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @property catalogConfig - The catalog configuration.
 * @property secrets - The deciphered secrets of the catalog.
 * @property importConfig - The specific import configuration, if applicable.
 * @property resourceId - The ID of the remote resource to download.
 * @property tmpDir - The path to the working directory where the resource will be downloaded.
 */
export type GetResourceContext<TCatalogConfig> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The specific import configuration, if applicable */
  importConfig: Record<string, any>
  /** The ID of the remote resource to download */
  resourceId: string,
  /** The path to the working directory where the resource will be downloaded */
  tmpDir: string,
  /** The log functions to write logs during the processing */
  log: LogFunctions
}

/**
 * Context for listing remote datasets in a catalog.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @template TCapabilities - The capabilities of the catalog.
 * @property catalogConfig - The catalog configuration.
 * @property secrets - The deciphered secrets of the catalog.
 * @property params - The specific parameters for listing datasets.
 */
export type ListDatasetsContext<TCatalogConfig> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The specific parameters for listing datasets */
  params: {
    /** The search field to filter datasets */
    q?: string,
    /** The mode :
     * - 'addAsResource': The remote dataset where the datafair dataset will be added as a resource.
     * - 'overwrite': he remote dataset that will be overwritten by the DataFair dataset.
     */
    mode: 'addAsResource' | 'overwrite'
  }
}

/**
 * Context for publishing a dataset.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @property catalogConfig - The catalog configuration.
 * @property secrets - The deciphered secrets of the catalog.
 * @property dataset - The datafair dataset to publish.
 * @property publication - The publication to process.
 * @property publicationSite - The site where the user will be redirected from the remote dataset.
 * @property publicationSite.title - The title of the publication site.
 * @property publicationSite.url - The URL of the publication site.
 * @property publicationSite.datasetUrlTemplate - The template for the URL to view the dataset in the publication site, using url-template syntax.
 */
export type PublishDatasetContext<TCatalogConfig> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The datafair dataset to publish */
  dataset: Record<string, any>,
  /** The publication to process */
  publication: Publication
  /** The site where the user will be redirected from the remote dataset. */
  publicationSite: {
    /** The title of the publication site */
    title: string,
    /** The URL of the publication site */
    url: string,
    /** The template for the URL to view the dataset in the publication site, using url-template syntax. */
    datasetUrlTemplate: string
  },
  /** The log functions to write logs during the processing */
  log: LogFunctions
}

/**
 * Context for deleting a published dataset.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @property catalogConfig - The catalog configuration.
 * @property secrets - The deciphered secrets of the catalog.
 * @property datasetId - The ID of the remote dataset to delete, or the dataset where the resource to delete is.
 * @property resourceId - The ID of the resource to delete, if applicable.
 */
export type DeleteDatasetContext<TCatalogConfig> = {
  /** The catalog configuration */
  catalogConfig: TCatalogConfig,
  /** The deciphered secrets of the catalog */
  secrets: Record<string, string>,
  /** The ID of the remote dataset to delete, or the dataset where the resource to delete is */
  datasetId: string,
  /** The ID of the resource to delete, if applicable */
  resourceId?: string
  /** The log functions to write logs during the processing */
  log: LogFunctions
}
