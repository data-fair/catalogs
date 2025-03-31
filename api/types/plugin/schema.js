export default {
  $id: 'https://github.com/data-fair/catalogs/plugin',
  'x-exports': [
    'types',
    'validate'
  ],
  title: 'plugin',
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'name',
    'description',
    'version',
    'distTag',
    'catalogConfigSchema'
  ],
  properties: {
    id: {
      type: 'string'
    },
    name: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    version: {
      type: 'string'
    },
    distTag: {
      type: 'string'
    },
    catalogConfigSchema: {
      type: 'object'
    }
  }
}
