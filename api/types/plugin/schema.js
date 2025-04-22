export default {
  $id: 'https://github.com/data-fair/catalogs/plugin',
  'x-exports': [
    'types',
    'validate'
  ],
  title: 'Plugin',
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'name',
    'version',
    'configSchema',
    'metadata'
  ],
  properties: {
    id: {
      type: 'string',
      pattern: '^[^/]*$',
      example: '@data-fair-catalog-mock'
    },
    name: {
      type: 'string',
      description: 'The package name of the plugin (from package.json).',
      example: '@data-fair/catalog-mock'
    },
    description: {
      type: 'string',
      description: 'The package description of the plugin (from package.json).'
    },
    version: {
      type: 'string'
    },
    configSchema: {
      type: 'object'
    },
    filtersSchema: {
      type: 'object'
    },
    metadata: {
      type: 'object',
      description: 'Metadata about the plugin.',
      additionalProperties: false,
      required: [
        'title',
        'description',
        'icon',
        'capabilities'
      ],
      properties: {
        title: {
          type: 'string',
        },
        description: {
          type: 'string',
        },
        icon: {
          type: 'string',
        },
        capabilities: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'listDatasets',
              'search',
              'pagination',
              'additionalFilters',
              'publishDataset'
            ]
          },
        }
      }
    }
  }
}
