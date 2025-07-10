export default {
  $id: 'https://github.com/data-fair/types-catalogs/capability',
  'x-exports': ['types'],
  type: 'string',
  title: 'Capability',
  description: `The list of capabilities that a catalog can have :
- import: The plugin can list some resources organized in folders and import them.
- search: The plugin can use the search param 'q' in the list method.
- pagination: The plugin can paginate the results of the list method.
- additionalFilters: The plugin can use additional filters in the list method.
- importConfig: The plugin gives an import configuration schema.
- publication: The plugin can list, publish, overwrite, and delete datasets.
- thumbnail: The plugin provides a thumbnail image and its path in the metadata. This thumbnail is visible during plugin selection and in the catalogs.
- thumbnailUrl: The plugin provides a thumbnail accessible via a URL defined by the prepare function. This thumbnail is visible only in the catalogs.`,
  enum: [
    'import',
    'search',
    'pagination',
    'additionalFilters',
    'importConfig',
    'publication',
    'thumbnail',
    'thumbnailUrl',
  ]
}
