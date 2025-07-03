export default {
  $id: 'https://github.com/data-fair/types-catalogs/publication',
  'x-exports': ['types'],

  type: 'object',
  title: 'Publication',
  additionalProperties: false,
  description: 'A small object that contains the information needed to publish or update a dataset or a resource',
  properties: {
    remoteDataset: {
      type: 'object',
      required: ['id'],
      additionalProperties: false,
      description: 'Dataset from the remote catalog, used if a local dataset is published as a dataset on a remote catalog. If it is defined during publication, then the remote dataset must be updated.',
      properties: {
        id: {
          type: 'string',
        },
        title: {
          type: 'string',
        },
        url: {
          type: 'string',
          description: 'URL to view the dataset in the remote catalog'
        }
      }
    },
    remoteResource: {
      type: 'object',
      required: ['id'],
      additionalProperties: false,
      description: 'Dataset\'s resource from the remote catalog, used if a local dataset is published as a resource on a remote catalog. If it is defined during publication, then the remote resource must be updated.',
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
    isResource: {
      type: 'boolean',
      description: 'If true, the publication is for a resource, otherwise it is for a dataset'
    }
  }
}
