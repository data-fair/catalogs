export default {
  $id: 'https://github.com/data-fair/catalogs/plugins-facets',
  'x-exports': [
    'types',
    'validate'
  ],
  title: 'PluginsFacets',
  type: 'object',
  additionalProperties: false,
  required: [
    'usages'
  ],
  properties: {
    usages: {
      type: 'object',
      additionalProperties: {
        type: 'number'
      }
    }
  }
}
