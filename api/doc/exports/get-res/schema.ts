export default {
  $id: 'https://github.com/data-fair/catalogs/exports/get-res',
  'x-exports': [
    'types',
    'validate'
  ],
  title: 'ExportsGetRes',
  type: 'object',
  additionalProperties: false,
  required: [
    'count',
    'results'
  ],
  properties: {
    count: {
      type: 'integer',
      minimum: 0
    },
    results: {
      type: 'array',
      items: {
        $ref: 'https://github.com/data-fair/catalogs/export'
      }
    }
  },
}
