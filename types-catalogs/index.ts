// Import types from json schemas
import type { Capability } from './capability/index.ts'
import type { Folder } from './folder/index.ts'
import type { Metadata } from './metadata/index.ts'
import type { Publication } from './publication/index.ts'
import type { Resource } from './resource/index.ts'

// Import types from ts files
import type { Includes } from './utils.ts'
import type {
  PrepareContext,
  ListContext,
  ListResourcesContext,
  GetResourceContext,
  ListDatasetsContext,
  PublishDatasetContext,
  DeleteDatasetContext
} from './contextes.ts'

// Export types from json schemas
export type { Capability } from './capability/index.ts'
export type { Folder } from './folder/index.ts'
export type { Log } from './log/index.ts'
export type { Metadata } from './metadata/index.ts'
export type { Publication } from './publication/index.ts'
export type { Resource } from './resource/index.ts'

// Export types from ts files
export type { LogFunctions } from './logs.ts'
export type {
  PrepareContext,
  ListContext,
  ListResourcesContext,
  GetResourceContext,
  ListDatasetsContext,
  PublishDatasetContext,
  DeleteDatasetContext
} from './contextes.ts'

/**
 * Generic catalog plugin interface.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @template TCapabilities - The capabilities of the catalog.
 */
export type CatalogPlugin<TCatalogConfig = object, TCapabilities extends Capability[] = Capability[]> =
  BaseCatalogPlugin<TCatalogConfig, TCapabilities> &
  (Includes<TCapabilities, 'import'> extends true ? WithImport<TCatalogConfig, TCapabilities> : {}) &
  (Includes<TCapabilities, 'publication'> extends true ? WithPublication<TCatalogConfig> : {})

type BaseCatalogPlugin<TCatalogConfig, TCapabilities extends Capability[]> = {
  metadata: CatalogMetadata<TCapabilities>
  configSchema: TCatalogConfig
  /** Function to validates the catalog configuration. */
  assertConfigValid(catalogConfig: any): asserts catalogConfig is TCatalogConfig,
  /**
   * Prepare function to extract secrets to cipher from the configuration,
   * and dynamically update capabilities.
   * This function is called when the catalog configuration is updated.
   * It can be used to:
   * - throw additional errors to validate the config
   * - remove secrets from the config and store them in the secrets object :<br>
   *      This function must copy the configuration fields to be encrypted into the secret object,
   *      then replace these fields in the configuration with ****.
   *      If the received configuration already contains ****, the secret should not be copied.
   *      If the field is empty, it should delete the secret.
   * - update the capabilities of the catalog based on the configuration
   * - provide a thumbnail URL dynamically based on the configuration (only if the 'thumbnailUrl' capability is included in the capabilities array)
   *
   * @param context.catalogConfig The catalog configuration, that can contain secrets to extract
   * @param context.capabilities The actuals capabilities of the catalog
   * @param context.secrets The actuals deciphered secrets of the catalog
   * @returns A promise that resolves to an object containing the catalog configuration, capabilities, secrets, and thumbnail URL.
   */
  prepare: (context: PrepareContext<TCatalogConfig, TCapabilities>) => Promise<{
    catalogConfig?: TCatalogConfig,
    capabilities?: TCapabilities,
    secrets?: Record<string, string>,
    thumbnailUrl?: string
  }>
}

/**
 * Type for catalog implementations that support listing and retrieving resources.
 * Resources are organized within folders in the catalog structure.
 *
 * @template TCatalogConfig - Configuration type for the catalog
 * @template TCapabilities - Array of capability types that the catalog supports
 */
type WithImport<TCatalogConfig, TCapabilities extends Capability[]> = {
  /**
   * List available folders and resources in the catalog.
   *
   * @deprecated Use `listResources` instead.
   */
  list?: (context: ListContext<TCatalogConfig, TCapabilities>) => Promise<{
    /** The total number of items in the current folder */
    count: number
    /** The list of folders and resources in the current folder, filtered with the search and pagination parameters */
    results: (Folder | Pick<Resource, 'id' | 'title' | 'description' | 'format' | 'mimeType' | 'origin' | 'size'> & { type: 'resource' })[],
    /** The path to the current folder, including the current folder itself, used to navigate back */
    path: Folder[]
  }>

  /**
   * List available folders and resources in the catalog
   */
  listResources: (context: ListResourcesContext<TCatalogConfig, TCapabilities>) => Promise<{
    /** The total number of items in the current folder */
    count: number
    /** The list of folders and resources in the current folder, filtered with the search and pagination parameters */
    results: (Folder | Pick<Resource, 'id' | 'title' | 'description' | 'format' | 'mimeType' | 'origin' | 'size'> & { type: 'resource' })[],
    /** The path to the current folder, including the current folder itself, used to navigate back */
    path: Folder[]
  }>

  /**
   * Download the resource to a temporary file and return the metadata of the resource.
   * @returns A promise that resolves to the metadata of the resource, including the path to the downloaded file.
   */
  getResource: (context: GetResourceContext<TCatalogConfig>) => Promise<Resource | undefined>
}
  & (Includes<TCapabilities, 'additionalFilters'> extends true ? { listFiltersSchema: Record<string, any> } : {})
  & (Includes<TCapabilities, 'importConfig'> extends true ? { importConfigSchema: Record<string, any> } : {})

type WithPublication<TCatalogConfig> = {
  /** List available datasets in the catalog. */
  listDatasets: (context: ListDatasetsContext<TCatalogConfig>) => Promise<{
    /** The list of datasets in the current folder, filtered with the search and mode parameters */
    results: { id: string, title: string }[]
  }>

  /**
   * Publish/Update a dataset or add/update a resource to a dataset
   * @param catalogConfig The configuration of the catalog
   * @param dataset The datafair dataset to publish
   * @param publication The publication to process
   * @param publicationSite The site where the user will be redirected from the remote dataset
   * @returns A promise that is resolved when the dataset is published
   */
  publishDataset: (context: PublishDatasetContext<TCatalogConfig>) => Promise<Publication>

  /**
   * Delete a dataset or remove a resource from a dataset
   * @param catalogConfig The configuration of the catalog
   * @param datasetId The id of the remoteDataset to delete, or the dataset where the resource to delete is
   * @param resourceId The id of the resource to delete
   */
  deleteDataset: (context: DeleteDatasetContext<TCatalogConfig>) => Promise<void>
}

/**
 * The metadata of the catalog plugin.
 * @template TCapabilities - This ensures that the `capabilities` field in the metadata is of the same type as `TCapabilities`.
 * @property capabilities - The capabilities of the catalog plugin, which is an array of `Capability` types.
 */
export type CatalogMetadata<TCapabilities extends Capability[]> = Metadata & {
  /** The capabilities of the catalog plugin */
  capabilities: TCapabilities
} &
(Includes<TCapabilities, 'thumbnail'> extends true ? { thumbnailPath: string } : {})

export default CatalogPlugin
