export default {
  $id: 'https://github.com/data-fair/types-catalogs/folder',
  'x-exports': ['types'],
  type: 'object',
  title: 'Folder',
  required: ['id', 'title', 'type'],
  additionalProperties: false,
  properties: {
    id: {
      type: 'string'
    },
    title: {
      type: 'string'
    },
    type: {
      const: 'folder',
    }
  }
}
