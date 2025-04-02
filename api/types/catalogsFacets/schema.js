export default {
  $id: 'https://github.com/data-fair/catalogs/catalogs-facets',
  'x-exports': [
    'types',
    'validate'
  ],
  title: 'CatalogsFacets',
  type: 'object',
  additionalProperties: false,
  required: [
    'plugins'
  ],
  properties: {
    plugins: {
      type: 'object',
      additionalProperties: {
        type: 'number'
      }
    },
    owners: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'name',
          'type',
          'count'
        ],
        properties: {
          id: {
            type: 'string'
          },
          name: {
            type: 'string'
          },
          type: {
            type: 'string'
          },
          count: {
            type: 'integer',
            minimum: 0
          },
          departments: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'department',
                'departmentName',
                'count'
              ],
              properties: {
                department: {
                  type: 'string'
                },
                departmentName: {
                  type: 'string'
                },
                count: {
                  type: 'integer',
                  minimum: 0
                }
              }
            }
          }
        }
      }
    }
  }
}
