export default {
  $id: 'https://github.com/data-fair/types-catalogs/metadata',
  'x-exports': ['types'],
  type: 'object',
  title: 'Metadata',
  description: 'The metadata of the catalog plugin',
  required: ['title', 'description', 'capabilities'],
  additionalProperties: false,
  properties: {
    title: {
      description: 'The title of the plugin to be displayed in the UI',
      type: 'string'
    },
    description: {
      description: 'The description of the plugin to be displayed in the UI',
      type: 'string'
    },
    capabilities: {
      description: 'The list of capabilities that a catalog can have.',
      type: 'array',
      items: {
        $ref: 'https://github.com/data-fair/types-catalogs/capability'
      }
    },
    thumbnailPath: {
      description: 'Optional path of the thumbnail image from the root of the plugin to be displayed in the UI.',
      type: 'string',
    }
  }
}
