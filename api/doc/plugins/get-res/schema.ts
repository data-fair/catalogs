export default {
  $id: 'https://github.com/data-fair/catalogs/Plugins/get-res',
  'x-exports': [
    'types',
    'validate'
  ],
  title: 'PluginsGetRes',
  type: 'object',
  additionalProperties: false,
  required: [
    'count',
    'facets',
    'results'
  ],
  properties: {
    count: {
      type: 'integer',
      minimum: 0
    },
    facets: {
      $ref: '#/$defs/facets'
    },
    results: {
      type: 'array',
      items: {
        $ref: 'https://github.com/data-fair/catalogs/plugin'
      }
    }
  },
  $defs: {
    facets: {
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
  }
}
