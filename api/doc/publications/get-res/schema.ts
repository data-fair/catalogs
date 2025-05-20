export default {
  $id: 'https://github.com/data-fair/catalogs/publications/get-res',
  title: 'PublicationsGetRes',
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
        $ref: 'https://github.com/data-fair/catalogs/publication'
      }
    }
  },
}
