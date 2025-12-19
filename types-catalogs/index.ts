// Import types from json schemas
import type { Capability } from './capability/index.ts'
import type { Folder } from './folder/index.ts'
import type { Metadata } from './metadata/index.ts'
import type { Publication } from './publication/index.ts'
import type { Resource } from './resource/index.ts'

// Import types from ts files
import type { Includes, HasPublicationCapability, IsListRequired } from './utils.ts'
import type {
  PrepareContext,
  ListContext,
  ListResourcesContext,
  GetResourceContext,
  PublishDatasetContext,
  DeletePublicationContext
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
  PublishDatasetContext,
  DeletePublicationContext
} from './contextes.ts'

/**
 * Generic catalog plugin interface.
 * @template TCatalogConfig - The type of the catalog configuration.
 * @template TCapabilities - The capabilities of the catalog.
 */
export type CatalogPlugin<TCatalogConfig = object, TCapabilities extends Capability[] = Capability[]> =
  BaseCatalogPlugin<TCatalogConfig, TCapabilities> &
  WithList<TCatalogConfig, TCapabilities> &
  (Includes<TCapabilities, 'import'> extends true ? WithImport<TCatalogConfig, TCapabilities> : {}) &
  (HasPublicationCapability<TCapabilities> extends true ? WithPublication<TCatalogConfig, TCapabilities> : {})

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

type WithList<TCatalogConfig, TCapabilities extends Capability[]> =
  IsListRequired<TCapabilities> extends true
    ? {
        /**
         * List available folders and resources in the catalog
         */
        list: (context: ListContext<TCatalogConfig, TCapabilities>) => Promise<{
          /** The total number of items in the current folder */
          count: number
          /** The list of folders and resources in the current folder, filtered with the search and pagination parameters */
          results: (Folder | Pick<Resource, 'id' | 'title' | 'description' | 'format' | 'mimeType' | 'origin' | 'size' | 'updatedAt'> & { type: 'resource' })[]
          /** The path to the current folder, including the current folder itself, used to navigate back */
          path: Folder[]
        }>
      }
    : {}

/**
 * Type for catalog implementations that support listing and retrieving resources.
 * Resources are organized within folders in the catalog structure.
 *
 * @template TCatalogConfig - Configuration type for the catalog
 * @template TCapabilities - Array of capability types that the catalog supports
 */
type WithImport<TCatalogConfig, TCapabilities extends Capability[]> = {
  /**
   * List available folders and resources in the catalog
   *
   * @deprecated Use `list` instead.
   */
  listResources?: (context: ListResourcesContext<TCatalogConfig, TCapabilities>) => Promise<{
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
  getResource: (context: GetResourceContext<TCatalogConfig>) => Promise<Resource>
}
  & (Includes<TCapabilities, 'additionalFilters'> extends true ? { listFiltersSchema: Record<string, any> } : {})
  & (Includes<TCapabilities, 'importFilters'> extends true ? { importFiltersSchema: Record<string, any> } : {})
  & (Includes<TCapabilities, 'importConfig'> extends true ? { importConfigSchema: Record<string, any> } : {})

type WithPublication<TCatalogConfig, TCapabilities extends Capability[]> = {
  /**
   * Publish a dataset / Update a publication
   * @param catalogConfig - The catalog configuration.
   * @param secrets - The deciphered secrets of the catalog.
   * @param dataset - The datafair dataset to publish.
   * @param publication - The publication to process.
   * @param publicationSite - The site where the user will be redirected from the remote dataset (required only if 'requiresPublicationSite' capability is present).
   * @param log - The log functions to write logs during the processing.
   * @returns A promise that is resolved when the dataset is published
   */
  publishDataset: (context: PublishDatasetContext<TCatalogConfig, TCapabilities>) => Promise<Publication>

  /**
   * Delete a publication
   * @param catalogConfig - The catalog configuration.
   * @param secrets - The deciphered secrets of the catalog.
   * @param folderId - The ID of the remote folder to delete.
   * @param resourceId - The ID of the resource to delete.
   * @param log - The log functions to write logs during the processing.
   */
  deletePublication: (context: DeletePublicationContext<TCatalogConfig>) => Promise<void>
} & (Includes<TCapabilities, 'publicationFilters'> extends true ? { publicationFiltersSchema: Record<string, any> } : {})

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
