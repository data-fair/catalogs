export default {
  $id: 'https://github.com/data-fair/types-catalogs/capability',
  'x-exports': ['types'],
  type: 'string',
  title: 'Capability',
  description: `The list of capabilities that a catalog can have.
Global capabilities:
- thumbnail: The plugin provides a thumbnail image and its path in the metadata. This thumbnail is visible during plugin selection and in the catalogs.
- thumbnailUrl: The plugin provides a thumbnail accessible via a URL defined by the prepare function. This thumbnail is visible only in the catalogs.
- search: The plugin can use the search param 'q' in the list method.
- pagination: The plugin can paginate the results of the list method.

Import capabilities:
- import: The plugin can list some resources organized in folders and import them.
- additionalFilters: [DEPRECATED] The plugin can use additional filters in the list method.
- importFilters: The plugin can use additional filters in the list method for imports.
- importConfig: The plugin gives an import configuration schema.

Publication capabilities:
- publication: The plugin can list, publish, overwrite, and delete datasets.
- publicationFilters: The plugin can use additional filters in the list method for publications.
- createFolderInRoot: The plugin can publish a dataset in the root folder.
- createFolder: The plugin can publish a dataset in a folder.
- createResource: The plugin can publish a dataset as a resource in a folder.
- replaceFolder: The plugin can overwrite an existing folder when publishing a dataset.
- replaceResource: The plugin can overwrite an existing resource when publishing a dataset.
`,
  enum: [
    // Global capabilities
    'thumbnail',
    'thumbnailUrl',
    'search',
    'pagination',

    // Import capabilities
    'import',
    'additionalFilters',
    'importFilters',
    'importConfig',

    // Publication capabilities
    'publication',
    'publicationFilters',
    'createFolderInRoot',
    'createFolder',
    'createResource',
    'replaceFolder',
    'replaceResource'
  ]
}
