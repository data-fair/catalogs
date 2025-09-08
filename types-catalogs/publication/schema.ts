export default {
  $id: 'https://github.com/data-fair/types-catalogs/publication',
  'x-exports': ['types'],
  type: 'object',
  title: 'Publication',
  additionalProperties: false,
  description: 'A small object that contains the information needed to publish or update a folder or a resource',
  required: ['action'],
  properties: {
    remoteFolder: {
      type: 'object',
      required: ['id'],
      additionalProperties: false,
      description: 'In create actions, the remote folder where to create the folder/resource. In other actions, the remote folder to update or delete',
      properties: {
        id: {
          type: 'string',
        },
        title: {
          type: 'string',
        },
        url: {
          type: 'string',
          description: 'URL to view the folder in the remote catalog'
        }
      }
    },
    remoteResource: {
      type: 'object',
      required: ['id'],
      additionalProperties: false,
      description: 'The remote resource to update or delete',
      properties: {
        id: {
          type: 'string',
        },
        title: {
          type: 'string',
        },
        url: {
          type: 'string',
          description: 'URL to view the resource in the remote catalog'
        }
      }
    },
    action: {
      type: 'string',
      description: 'The action to perform in the remote catalog.',
      enum: [
        'createFolderInRoot',
        'createFolder',
        'createResource',
        'replaceFolder',
        'replaceResource',
        'delete'
      ]
    },
  }
}
