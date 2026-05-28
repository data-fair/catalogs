export default {
  $id: 'https://github.com/data-fair/types-catalogs/capability',
  'x-exports': ['types'],
  type: 'string',
  title: 'Capability',
  description: `The list of capabilities that a catalog can have.
Global capabilities:
- thumbnail: [DEPRECATED] Since the Registry migration (catalogs v1.0.0), plugin thumbnails are uploaded to and served by the Registry, not bundled with the plugin code. Declaring this capability has no runtime effect anymore.
- thumbnailUrl: The plugin provides a thumbnail accessible via a URL defined by the prepare function. This thumbnail is visible only in the catalogs.
- search: The plugin can use the search param 'q' in the list method.
- pagination: The plugin can paginate the results of the list method.

Import capabilities:
- import: The plugin can list some resources organized in folders and import them.
- additionalFilters: [DEPRECATED] Original generic "extra filters in the list method", replaced by the more specific 'importFilters' (filters when listing for an import) and 'publicationFilters' (filters when listing for a publication).
- importFilters: The plugin can use additional filters in the list method for imports.
- importConfig: The plugin gives an import configuration schema.

Publication capabilities:
- publication: [DEPRECATED] Original coarse-grained "the plugin supports publication" flag, replaced by the granular set 'createFolderInRoot' / 'createFolder' / 'createResource' / 'replaceFolder' / 'replaceResource' so the UI can show only the actions actually supported by each target.
- createFolderInRoot: The plugin can publish a dataset in the root folder.
- createFolder: The plugin can publish a dataset in a folder.
- createResource: The plugin can publish a dataset as a resource in a folder.
- replaceFolder: The plugin can overwrite an existing folder when publishing a dataset.
- replaceResource: The plugin can overwrite an existing resource when publishing a dataset.
- publicationFilters: The plugin can use additional filters in the list method for publications.
- requiresPublicationSite: The plugin requires a publication site to publish datasets.
`,
  enum: [
    // Global capabilities
    'thumbnail', // DEPRECATED
    'thumbnailUrl',
    'search',
    'pagination',

    // Import capabilities
    'import',
    'additionalFilters', // DEPRECATED
    'importFilters',
    'importConfig',

    // Publication capabilities
    'publication', // DEPRECATED
    'createFolderInRoot',
    'createFolder',
    'createResource',
    'replaceFolder',
    'replaceResource',
    'publicationFilters',
    'requiresPublicationSite'
  ]
}
